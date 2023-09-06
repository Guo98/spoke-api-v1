import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { getEmailId, getEmailBody } from "../services/gmail.js";
import { config } from "../utils/config.js";
import { Orders } from "../models/orders.js";
import { setOrders } from "../services/database.js";
import { mapLineItems } from "../utils/mapItems.js";
import { addOrderRow } from "../services/googleSheets.js";
import { createRecord } from "../services/airtable.js";
import { createConsolidatedRow } from "../utils/googleSheetsRows.js";
import { basicAuth } from "../services/basicAuth.js";
import { checkJwt } from "../services/auth0.js";
import { sendSupportEmail, sendConfirmation } from "../services/sendEmail.js";
import {
  sendMarketplaceRequestEmail,
  sendMarketplaceResponse,
} from "../services/emails/marketplace.js";
import { determineContainer } from "../utils/utility.js";
import { exportOrders } from "../services/excel.js";
// import { createYubikeyShipment } from "../utils/yubikey.js";
import { getAllInventory } from "./inventory.js";
import { inventoryMappings } from "../utils/parsers/cdwConstants.js";
import { trackPackage } from "../services/fedex.js";
import { trackUPSPackage } from "../services/ups.js";
import { getYubikeyShipmentInfo } from "../utils/yubikey.js";

const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});

const orders = new Orders(cosmosClient, "Orders", "Received");

orders
  .init((err) => {
    console.log("cosmos orders db init err: ", err);
  })
  .catch((err) => {
    console.error("shutting down because of error: ", err);
    process.exit(1);
  });

const router = Router();

router.post("/pushTracking", async (req, res) => {
  const historyData = JSON.parse(atob(req.body.message.data));
  const newHistoryId = historyData?.historyId;
  console.log(`/pushTracking/${newHistoryId} => Starting route.`);
  let historyRecord = await orders.getLastReadEmail();
  const prevHistoryId = historyRecord?.historyId;
  const prevEmailId = historyRecord?.messageId;

  console.log(
    `/pushTracking/${newHistoryId} => Got old history data: ${prevHistoryId}`
  );

  if (historyData.historyId) {
    historyRecord.historyId = newHistoryId;
    try {
      console.log(
        `/pushTracking/${newHistoryId} => Starting getEmailId() with: ${prevHistoryId}`
      );
      const msgId = await getEmailId(prevHistoryId, orders, prevEmailId);
      if (msgId !== "") {
        historyRecord.messageId = msgId;
      }

      console.log(
        `/pushTracking/${newHistoryId} => Finishing getEmailId() with: ${prevHistoryId}`
      );
    } catch (e) {
      console.log(
        `/pushTracking/${newHistoryId} => Error in getEmailId(): ${e}`
      );
    }

    try {
      console.log(`/pushTracking/${newHistoryId} => Updating history id.`);
      const updateResult = await orders.updateHistoryId(historyRecord);
      console.log(
        `/pushTracking/${newHistoryId} => Finished updating history id.`
      );
    } catch (e) {
      console.log(
        `/pushTracking/${newHistoryId} => Error updating history id.`
      );
    }
  }
  res.send({ message: "Successful!" });
});

// router.get("/getMessage/:messageid", async (req, res) => {
//   const messageId = req.params.messageid;
//   //const receivedOrders = await orders.getAllReceived();
//   const updateItems = await getEmailBody(messageId, orders);
//   // console.log("update items ::::::::: ", updateItems);
//   // if (updateItems && updateItems[0]) {
//   //   await orders.updateOrder(updateItems[0], updateItems[1]);
//   // }
//   // try {
//   //   await sendAftershipCSV(btoa("testing this out"), "10800");
//   // } catch (e) {
//   //   console.log("testing out sending email error: ", e);
//   // }
//   const todayDate = new Date();
//   todayDate.toLocaleString("en-US", { timeZone: "America/New_York" });
//   res.json({ "Hello world email!": todayDate.getMonth() });
// });

/**
 * @param {string} body.customer_name
 * @param {string} body.customer_address
 * @param {Array} body.orders
 * @param {Number} body.order_no
 */
router.post("/createOrder", async (req, res) => {
  console.log("/createOrder => Starting route.");
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    console.log("/createOrder => Unauthorized (Missing auth).");
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  const isAuthenticated = await basicAuth(req.headers.authorization);
  if (isAuthenticated) {
    const { customerInfo } = req.body;
    const mappedInfo = await mapLineItems(customerInfo);

    const {
      orderNo,
      firstName,
      lastName,
      address,
      note,
      items,
      email,
      phone,
      client,
    } = mappedInfo;

    console.log("/createOrder => Adding order to consolidated order sheet.");
    for (let i = 0; i < items.length; i++) {
      console.log("/createOrder => Mapped row item: " + items[i].name);
      try {
        const orderValues = createConsolidatedRow(
          orderNo,
          client,
          firstName + " " + lastName,
          email,
          items[i].name,
          items[i].price,
          address,
          phone,
          note,
          items[i].variant,
          items[i].supplier,
          items[i].quantity
        );
        const resp = await addOrderRow(
          orderValues,
          "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
          1276989321,
          19
        );
      } catch (e) {
        console.log(
          "/createOrder => Error in adding row to consolidated orders sheet: ",
          item[i].name
        );
      }
    }
    if (items.length > 0) {
      if (client === "FLYR") {
        console.log("/createOrder => Adding order to airtable.");
        await createRecord(mappedInfo, client);
      }
      console.log("/createOrder => Adding order to Orders db.");
      await setOrders(orders, mappedInfo);
      console.log("/createOrder => Ending route.");
    } else {
      console.log("/createOrder => No items were present.");
    }
    console.log("/createOrder => Finished.");
    res.send("Creating order");
  } else {
    console.log("/createOrder => Unauthorized (Wrong header).");
    res.status(401).json({ message: "Wrong Authentication" });
  }
});

router.get("/orders/All", checkJwt, async (req, res) => {
  console.log(`[GET] /orders/All => Starting route.`);
  const containedIdClients = [
    "Received",
    "Alma",
    "Automox",
    "Bowery",
    "Flo Health",
    "Hidden Road",
    "Intersect Power",
    "NurseDash",
    "Roivant",
  ];

  let allOrders = { in_progress: [], completed: [] };

  for await (const container of containedIdClients) {
    let ordersRes = await orders.getAllOrders(container);

    if (container === "Received") {
      allOrders.in_progress = allOrders.in_progress.concat(ordersRes);
    } else {
      allOrders.completed = allOrders.completed.concat(ordersRes);
    }
  }

  res.json({ data: allOrders });
  console.log(`[GET] /orders/All => Finished route.`);
});

router.get("/orders/:company/:entity?", checkJwt, async (req, res) => {
  // res.setHeader("Access-Control-Allow-Origin", "*");
  // res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  const company = req.params.company;
  let dbContainer = "";
  let client = "";

  switch (company) {
    case "public":
      dbContainer = "Mock";
      client = "Public";
      break;
    case "FLYR":
      dbContainer = "FLYR";
      client = "FLYR";
      break;
    default:
      dbContainer = company;
      client = company;
      break;
  }

  console.log(`[GET] /orders/${company} => Starting route.`);

  const querySpec = {
    query: req.params.entity
      ? "SELECT * FROM Received r WHERE r.client = @client AND r.entity = @entity"
      : "SELECT * FROM Received r WHERE r.client = @client",
    parameters: req.params.entity
      ? [
          {
            name: "@client",
            value: client,
          },
          {
            name: "@entity",
            value: req.params.entity,
          },
        ]
      : [
          {
            name: "@client",
            value: client,
          },
        ],
  };

  if (dbContainer !== "") {
    try {
      console.log(
        `[GET] /orders/${company} => Getting all orders from container: ${dbContainer}`
      );
      let ordersRes = await orders.getAllOrders(dbContainer);

      if (req.params.entity) {
        ordersRes = ordersRes.filter(
          (order) => order.entity === req.params.entity
        );
      }

      for await (let order of ordersRes) {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;

        const delResult = await orderItemsDelivery(order, company);

        if (delResult.status === 200 && delResult.data !== "No Change") {
          order = { ...delResult.data };
        }
      }
      console.log(
        `[GET] /orders/${company} => Finished getting all orders from container: ${dbContainer}`
      );

      console.log(
        `[GET] /orders/${company} => Getting all in progress orders for company: ${client}`
      );
      let inProgRes = await orders.find(querySpec);

      for await (let order of inProgRes) {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;

        const delResult = await orderItemsDelivery(order, "Received");
        if (delResult.status === 200 && delResult.data !== "No Change") {
          order = { ...delResult.data };
        }
      }
      console.log(
        `[GET] /orders/${company} => Finished getting all in progress orders for company: ${client}`
      );
      res.json({ data: { in_progress: inProgRes, completed: ordersRes } });
    } catch (e) {
      console.log(
        `[GET] /orders/${company} => Error in getting all orders: ${e}`
      );
      res.status(500).json({ status: "Error in getting info" });
    }
  } else {
    console.log(`[GET] /orders/${company} => Company doesn't exist in DB.`);
    res.status(500).json({ status: "Error in DB" });
  }
  console.log(`/getAllOrders/${company} => Ending route.`);
});

router.post("/supportEmail", checkJwt, async (req, res) => {
  console.log("/supportEmail => Starting route.");
  try {
    console.log("/supportEmail => Sending support email.");
    const emailRes = await sendSupportEmail({ ...req.body, type: "support" });
    console.log("/supportEmail => Sent support email successfully.");
  } catch (e) {
    console.log("/supportEmail => Error in sending support email.");
    res.status(500).json({ message: "Not successful" });
  }

  if (!res.headersSent) res.json({ message: "Successful" });

  console.log("/supportEmail => Ending route.");
});

router.get("/downloadorders/:client/:entity?", checkJwt, async (req, res) => {
  let containerId = determineContainer(req.params.client);
  console.log(`/downloadorders/${req.params.client} => Starting route.`);
  try {
    console.log(`/downloadorders/${req.params.client} => Getting all orders.`);
    let client = "";
    switch (req.params.client) {
      case "public":
        client = "Mock";
        break;
      case "FLYR":
        client = "FLYR";
        break;
      default:
        client = req.params.client;
        break;
    }

    const querySpec = {
      query: req.params.entity
        ? "SELECT * FROM Received r WHERE r.client = @client AND r.entity = @entity"
        : "SELECT * FROM Received r WHERE r.client = @client",
      parameters: req.params.entity
        ? [
            {
              name: "@client",
              value: client,
            },
            {
              name: "@entity",
              value: req.params.entity,
            },
          ]
        : [
            {
              name: "@client",
              value: client,
            },
          ],
    };

    if (containerId !== "") {
      const ordersRes = await orders.getAllOrders(containerId);

      let allOrders = [];

      if (client !== "") {
        const inProgRes = await orders.find(querySpec);

        if (inProgRes.length > 0) {
          inProgRes.reverse().forEach((order) => {
            order.items.forEach((item) => {
              allOrders.push({
                orderNo: order.orderNo,
                name: order.firstName + " " + order.lastName,
                item: item.name,
                price: item.price,
                date: order.date,
                location:
                  order.address.subdivision + ", " + order.address.country,
              });
            });
          });
        }
      }

      if (ordersRes.length > 0) {
        ordersRes.reverse().forEach((order) => {
          if (req.params.entity) {
            if (req.params.entity === order.entity) {
              order.items.forEach((item) => {
                allOrders.push({
                  orderNo: order.orderNo,
                  name: order.firstName + " " + order.lastName,
                  item: item.name,
                  price: item.price,
                  date: order.date,
                  location:
                    order.address.subdivision + ", " + order.address.country,
                });
              });
            }
          } else {
            order.items.forEach((item) => {
              allOrders.push({
                orderNo: order.orderNo,
                name: order.firstName + " " + order.lastName,
                item: item.name,
                price: item.price,
                date: order.date,
                location:
                  order.address.subdivision + ", " + order.address.country,
              });
            });
          }
        });
      }

      console.log(
        `/downloadorders/${req.params.client} => Got list of all orders.`
      );

      await exportOrders(res, allOrders, req.params.client);
    }
  } catch (e) {
    console.log(
      `/downloadorders/${req.params.client} => Error in getting all orders. Error: ${e}`
    );
    if (!res.headersSent) res.status(500).send({ status: "Error in here" });
  }
  // res.send("Hello World!");
  console.log(`/downloadorders/${req.params.client} => Ending route.`);
});

router.post("/updateTrackingNumber", checkJwt, async (req, res) => {
  const { client, status, order_id, items, full_name } = req.body;
  console.log(`/updateTrackingNumber/${client} => Starting route.`);

  try {
    console.log(
      `/updateTrackingNumber/${client} => Trying to get item from Received container.`
    );
    const receivedRes = await orders.getItem(order_id, full_name);

    if (receivedRes) {
      try {
        const dbResp = await orders.updateOrderByContainer(
          "Received",
          order_id,
          full_name,
          items
        );
      } catch (e) {
        console.log(
          `/updateTrackingNumber/${client} => Error in updating Received db with tracking number: ${e}`
        );
        res.status(500).json({ status: "Error in updating db: " + e });
      }
    } else {
      try {
        const dbResp = await orders.updateOrderByContainer(
          client,
          order_id,
          full_name,
          items
        );
      } catch (e) {
        console.log(
          `/updateTrackingNumber/${client} => Error in updating ${client} db with tracking number: ${e}`
        );
        res.status(500).json({ status: "Error in updating db: " + e });
      }
    }
  } catch (e) {
    console.log(
      `/updateTrackingNumber/${client} => Error in reading received container. ${e}`
    );
    res.status(500).json({ status: "Error in reading" });
  }

  if (!res.headersSent) res.json({ status: "Success" });
  console.log(`/updateTrackingNumber/${client} => Ending route.`);
});

router.post("/completeOrder", checkJwt, async (req, res) => {
  const { client, id, full_name, shipping_status } = req.body;
  console.log(`/completeOrder/${client} => Starting route.`);
  try {
    console.log(
      `/completeOrder/${client} => Seeing if order is in received container.`
    );
    const receivedRes = await orders.getItem(id, full_name);
    console.log(`/completeOrder/${client} => Order result: ${receivedRes}`);

    if (receivedRes) {
      if (shipping_status === "Completed") {
        try {
          console.log(
            `/completeOrder/${client} => Removing id: ${id} from Received container.`
          );
          await orders.removeFromReceived(id, full_name);
          console.log(
            `/completeOrder/${client} => Finished removing id: ${id} from Received container.`
          );
        } catch (e) {
          console.log(
            `/completeOrder/${client} => Error removing id: ${id} from Received container. Error: ${e}`
          );
          res
            .status(500)
            .json({ status: "Error in removing from Received container." });
        }

        if (!res.headersSent) {
          try {
            console.log(
              `/completeOrder/${client} => Adding order to ${client} container.`
            );
            req.body.shipping_status = "Completed";
            const updateResp = await orders.completeOrder(
              client === "Public" ? "Mock" : client,
              req.body
            );
            console.log(
              `/completeOrder/${client} => Finished adding order to ${client} container`
            );
          } catch (e) {
            console.log(
              `/completeOrder/${client} => Error in adding order to ${client} container. Error: ${e}`
            );
            res.status(500).json({ status: "Error in moving to container" });
          }
        }
      } else {
        try {
          console.log(
            `/completeOrder/${client} => Updating order status in received container.`
          );
          // req.body.shipping_status = "Completed";
          const updateResp = await orders.updateOrderStatusByContainer(
            "Received",
            id,
            full_name,
            shipping_status
          );
          console.log(
            `/completeOrder/${client} => Finished updating order status in received container`
          );
        } catch (e) {
          console.log(
            `/completeOrder/${client} => Error in updating order status in received container. Error: ${e}`
          );
          res
            .status(500)
            .json({ status: "Error in updating status in container" });
        }
      }
    } else {
      try {
        console.log(
          `/completeOrder/${client} => Updating order status in ${client} container.`
        );
        // req.body.shipping_status = "Completed";
        const updateResp = await orders.updateOrderStatusByContainer(
          client === "Public" ? "Mock" : client,
          id,
          full_name,
          shipping_status
        );
        console.log(
          `/completeOrder/${client} => Finished updating order status in ${client} container`
        );
      } catch (e) {
        console.log(
          `/completeOrder/${client} => Error in updating order status in ${client} container. Error: ${e}`
        );
        res
          .status(500)
          .json({ status: "Error in updating status in container" });
      }
    }
  } catch (e) {
    console.log(
      `/completeOrder/${client} => Error checking if order exists in received container. ${e}`
    );
    res.status(500).json({ status: "Error in reading received container" });
  }

  console.log(`/completeOrder/${client} => Ending route.`);
  if (!res.headersSent) res.json({ status: "Success" });
});

router.post("/newPurchase", checkJwt, async (req, res) => {
  const {
    client,
    notes: { device, recipient },
  } = req.body;

  try {
    console.log(
      `/newPurchase/${client} => Adding new request to db:`,
      req.body
    );
    let orderRes = await orders.getAllOrders("Marketplace");

    await orders.addOrderByContainer("Marketplace", {
      ...req.body,
      status: "Received",
      market_order: orderRes.length.toString().padStart(5, "0"),
    });
    console.log(`/newPurchase/${client} => Finished adding new request to db.`);
  } catch (e) {
    console.log(`/newPurchase/${client} => Error in adding to database: ${e}`);
    res.status(500).json({ status: "Error" });
  }

  try {
    console.log(
      `/newPurchase/${client} => Sending marketplace request notification email.`
    );
    await sendMarketplaceRequestEmail({ ...req.body, type: "userrequest" });
    console.log(
      `/newPurchase/${client} => Finished sending marketplace request notification email.`
    );
  } catch (e) {
    console.log(
      `/newPurchase/${client} => Error in sending market request email: ${e}`
    );
  }

  if (!res.headersSent) res.json({ status: "Successful" });
});

router.get("/marketplaceorders/:client?", checkJwt, async (req, res) => {
  console.log("[GET] /marketplaceorders => Starting route.");
  try {
    console.log(
      "[GET] /marketplaceorders => Getting all orders from marketplace."
    );
    let orderRes = await orders.getAllOrders("Marketplace");
    if (req.params.client) {
      orderRes = orderRes.filter((order) => order.client === req.params.client);
    }
    orderRes.forEach((order) => {
      delete order._rid;
      delete order._self;
      delete order._etag;
      delete order._attachments;
      delete order._ts;
    });
    console.log("[GET] /marketplaceorders => Got all orders from marketplace.");
    res.json({ status: "Successful", data: orderRes });
  } catch (e) {
    console.log(
      `[GET] /marketplaceorders => Error in getting all marketplace orders: ${JSON.stringify(
        e
      )}`
    );
    res.status(500).json({ status: "Error" });
  }
  console.log("[GET] /marketplaceorders => Finished route.");
});

router.post("/marketplaceorders", checkJwt, async (req, res) => {
  console.log("[POST] /marketplaceorders => Starting route.");
  const { id, client } = req.body;
  try {
    console.log("[POST] /marketplaceorders => Starting update db function.");
    if (!req.body.updateClient) {
      const updateRes = await orders.updateMarketOrder(
        id,
        client,
        req.body.status || "",
        "",
        req.body.price || "",
        req.body.approved !== undefined ? req.body.approved : "",
        req.body.entity || "",
        req.body.requestor_email || ""
      );
    } else {
      const updateRes = await orders.updateMarketplaceClient(
        id,
        req.body.updateClient
      );
    }

    console.log("[POST] /marketplaceorders => Finished update db function.");
  } catch (e) {
    console.log("[POST] /marketplaceorders => Error in updating db: ", e);
    res.status(500).json({ status: "Error" });
  }
  console.log("[POST] /marketplaceorders => Finished route.");
  if (!res.headersSent) res.json({ status: "Successful" });

  if (req.body.approved !== undefined) {
    try {
      await sendMarketplaceResponse(req.body);
      console.log(
        `[POST] /marketplaceorders => Successfully sent approval/denial email.`
      );
    } catch (e) {
      console.log(
        `[POST] /marketplaceorders => Error in sending approval/denial email: `,
        e
      );
    }
  }
});

router.delete("/marketplaceorders/:client/:id", checkJwt, async (req, res) => {
  const { client, id } = req.params;
  console.log(`[DELETE] /marketplaceorders => Starting route for ${client}`);
  try {
    await orders.deleteOrder("Marketplace", id, client);
  } catch (e) {
    console.log(
      `[DELETE] /marketplaceorders => Error in deleting marketplace order for ${client}:`,
      e
    );
    res.status(500).json({ status: "Error" });
  }
  if (!res.headersSent) res.json({ status: "Successful" });
  console.log(`[DELETE] /marketplaceorders => Finishing route for ${client}`);
});

router.post("/deleteOrder", checkJwt, async (req, res) => {
  const { client, id, full_name } = req.body;
  console.log(`/deleteOrder => Starting route for ${client}`);
  try {
    await orders.deleteOrder(client, id, full_name);
  } catch (e) {
    console.log(`/deleteOrder => Error in deleting order for ${client}:`, e);
    res.status(500).json({ status: "Error" });
  }
  if (!res.headersSent) res.json({ status: "Successful" });
  console.log(`/deleteOrder => Finishing route for ${client}`);
});

const addMarketplaceOrder = async (request) => {
  let orderRes = await orders.getAllOrders("Marketplace");
  await orders.addOrderByContainer("Marketplace", {
    ...request,
    status: "Received",
    market_order: orderRes.length.toString().padStart(5, "0"),
  });
};

const updateMarketplaceFile = async (id, client, filename) => {
  await orders.updateMarketOrder(id, client, "", filename);
};

const marketplaceSentApprovalEmail = async (id, client) => {
  await orders.sentMarketplaceEmail(id, client);
};

const orderItemsDelivery = async (order, containerId) => {
  console.log(
    `orderItemDelivery(${order.client}) => Starting function:`,
    order.id
  );

  if (order.shipping_status !== "Completed") {
    let change = false;
    for await (const item of order.items) {
      if (item.courier) {
        if (item.courier.toLowerCase() === "fedex") {
          if (
            item.tracking_number.length > 0 &&
            item.delivery_status !== "Delivered"
          ) {
            const deliveryResult = await trackPackage(item.tracking_number[0]);
            if (deliveryResult.status === 200) {
              change = true;
              item.delivery_status = deliveryResult.data;
            }
          }
        } else if (item.courier.toLowerCase() === "ups") {
          if (
            item.tracking_number.length > 0 &&
            item.delivery_status !== "Delivered"
          ) {
            const deliveryResult = await trackUPSPackage(
              item.tracking_number[0].trim()
            );
            if (deliveryResult.status === 200) {
              change = true;
              item.delivery_status = deliveryResult.data;
            }
          }
        }
      }
      if (item.name.toLowerCase().includes("yubikey 5c nfc (automox)")) {
        if (item.shipment_id) {
          const yubiShipping = await getYubikeyShipmentInfo(item.shipment_id);
          if (
            yubiShipping &&
            yubiShipping.tracking_number &&
            item.delivery_status !== "Delivered"
          ) {
            change = true;
            if (item.tracking_number === "") {
              item.tracking_number = [yubiShipping.tracking_number];
              item.courier = yubiShipping.courier;
              item.delivery_status = yubiShipping.delivery_description;
            } else if (
              item.delivery_status !== yubiShipping.delivery_description
            ) {
              item.delivery_status = yubiShipping.delivery_description;
            }
          }
        }
      }
    }

    if (change) {
      try {
        console.log(
          `orderItemDelivery(${order.client}) => Updating shipping status:`,
          order.id
        );
        const updateDelivery = await orders.updateOrderByContainer(
          containerId,
          order.id,
          order.full_name,
          order.items
        );
        console.log(
          `orderItemDelivery(${order.client}) => Finished updating shipping status:`,
          order.id
        );
        return { status: 200, data: updateDelivery };
      } catch (e) {
        console.log(
          `orderItemDelivery(${order.client}) => Error in updating delivery status of order:`,
          order.id
        );
        return { status: 500, data: "Error" };
      }
    } else {
      return { status: 200, data: "No Change" };
    }
  } else {
    return { status: 200, data: "No Change" };
  }
};

const addNewDocument = async (containerId, doc) => {
  try {
    console.log(
      "addNewDocument() => Starting adding document to:",
      containerId
    );
    const newDoc = await orders.addOrderByContainer(containerId, doc);
    console.log(
      "addNewDocument() => Finished adding document to:",
      containerId
    );
    return newDoc;
  } catch (e) {
    console.log(
      "addNewDocument() => Error in adding document to:",
      containerId
    );
    return "Error";
  }
};

const addItems = async (containerId, newItems) => {};

const resetMockApprovals = async () => {
  try {
    let mockApproval = await orders.getItemByContainer(
      "Marketplace",
      "26b08ccb-d51c-4312-bd8c-20ae237e6bdd",
      "public"
    );

    if (mockApproval.approved !== undefined) {
      delete mockApproval.approved;
      await orders.updateItemByContainer(
        "Marketplace",
        "26b08ccb-d51c-4312-bd8c-20ae237e6bdd",
        "public",
        mockApproval
      );
    }
  } catch (e) {
    console.log("resetMockApprovals() => Error in reseting approvals:", e);
  }
};

const createOrdersContainer = async (client) => {
  const newCoResponse = await orders.newContainer(client);
  return newCoResponse;
};

export default router;

export {
  addMarketplaceOrder,
  updateMarketplaceFile,
  marketplaceSentApprovalEmail,
  resetMockApprovals,
  createOrdersContainer,
  addNewDocument,
};
