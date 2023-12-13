import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { getEmailId, getEmailBody } from "../services/gmail.js";
import { config } from "../utils/config.js";
import { Orders } from "../models/orders.js";
import { setOrders } from "../services/database.js";
import { mapLineItems } from "../utils/mapItems.js";
import { addOrderRow } from "../services/googleSheets.js";
import {
  createConsolidatedRow,
  createMissingMappingRow,
} from "../utils/googleSheetsRows.js";
import { basicAuth } from "../services/basicAuth.js";
import { checkJwt } from "../services/auth0.js";
import { sendSupportEmail } from "../services/sendEmail.js";
import {
  sendMarketplaceRequestEmail,
  sendMarketplaceResponse,
} from "../services/emails/marketplace.js";
import { determineContainer } from "../utils/utility.js";
import { exportOrders } from "../services/excel.js";

import { getFedexToken, updateFedexStatus } from "../services/fedex.js";
import { trackUPSPackage, getToken } from "../services/ups.js";
import { getYubikeyShipmentInfo } from "../utils/yubikey.js";
import { offboardDevice } from "./inventory.js";
import { placeCDWOrder } from "../services/suppliers/cdw/order.js";

import { cdw_to_item_name } from "../utils/mappings/cdw_part_numbers.js";

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
      if (!items[i].name.toLowerCase().includes("return box")) {
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
    }
    if (items.length > 0) {
      // if (client === "FLYR") {
      //   console.log("/createOrder => Adding order to airtable.");
      //   await createRecord(mappedInfo, client);
      // }
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
  let fedex_token = "";
  const fedex_token_resp = await getFedexToken();

  if (fedex_token_resp.status === 200) {
    fedex_token =
      fedex_token_resp.data.token_type +
      " " +
      fedex_token_resp.data.access_token;
  }

  let ups_token = "";
  const ups_token_resp = await getToken();

  if (ups_token_resp.status === 200) {
    ups_token =
      ups_token_resp.data.token_type + " " + ups_token_resp.data.access_token;
  }

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

      let fedex_items = [];

      for await (let order of ordersRes) {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;

        const delResult = await orderItemsDelivery(order, company, ups_token);

        if (delResult.status === 200 && delResult.data !== "No Change") {
          order = { ...delResult.data };
        } else if (
          delResult.status === 200 &&
          delResult.fedex_items &&
          delResult.fedex_items.length > 0
        ) {
          fedex_items = [...fedex_items, ...delResult.fedex_items];
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

        const delResult = await orderItemsDelivery(
          order,
          "Received",
          ups_token
        );
        if (delResult.status === 200 && delResult.data !== "No Change") {
          order = { ...delResult.data };
        } else if (
          delResult.status === 200 &&
          delResult.fedex_items &&
          delResult.fedex_items.length > 0
        ) {
          fedex_items = [...fedex_items, ...delResult.fedex_items];
        }
      }
      if (fedex_items.length > 0) {
        await updateFedexStatus(fedex_token, fedex_items.splice(0, 30), orders);
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

const export_order = (order, item) => {
  let order_body = {
    orderNo: order.orderNo,
    name: order.firstName ? order.firstName + " " + order.lastName : "",
    item: item.name ? item.name : "",
    price: item.price ? item.price : "",
    date: order.date ? order.date : "",
    location: order.address?.subdivision + ", " + order.address?.country,
    spoke_fee: item.spoke_fee,
    serial_no: item.serial_number,
  };
  if (order.entity) {
    order_body.entity = order.entity;
  }

  return order_body;
};

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
              allOrders.push(export_order(order, item));
            });
          });
        }
      }

      if (ordersRes.length > 0) {
        ordersRes.reverse().forEach((order) => {
          if (req.params.entity) {
            if (req.params.entity === order.entity) {
              order.items.forEach((item) => {
                allOrders.push(export_order(order, item));
              });
            }
          } else {
            order.items.forEach((item) => {
              allOrders.push(export_order(order, item));
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
    return_device,
    order_type,
  } = req.body;
  let approval_number = "";
  try {
    console.log(
      `/newPurchase/${client} => Adding new request to db:`,
      req.body
    );
    let orderRes = await orders.getAllOrders("Marketplace");
    approval_number = orderRes.length.toString().padStart(5, "0");
    await orders.addOrderByContainer("Marketplace", {
      ...req.body,
      status: "Received",
      market_order: approval_number,
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

  if (return_device) {
    console.log(`/newPurchase/${client} => Creating offboard row.`);
    const { recipient_name, email, phone_number, address, requestor_email } =
      req.body;
    try {
      await offboardDevice(res, {
        client,
        recipient_name: recipient_name,
        recipient_email: email,
        device_name: "",
        type: "Return",
        shipping_address: address,
        phone_num: phone_number,
        requestor_email,
        note: "",
        device_condition: "",
        activation_key: "",
      });
      console.log(
        `/newPurchase/${client} => Successfully created offboarding row.`
      );
    } catch (e) {
      console.log(
        `/newPurchase/${client} => Error in adding row to offboarding sheet:`,
        e
      );
    }
  }

  if (order_type === "Buy Directly from CDW") {
    let todays_date = new Date();
    todays_date = todays_date.toISOString().split("T")[0];
    const cdw_body = {
      orderHeader: {
        customerId: req.body.customer_id,
        orderDate: todays_date,
        currency: "USD",
        orderAmount: req.body.unit_price,
        orderId: approval_number,
        comments: req.body.shipping_rate,
        shipTo: {
          firstName: req.body.cdw_name.first_name,
          lastName: req.body.cdw_name.last_name,
          address1: "ALMA Withspoke",
          street: req.body.cdw_address.addressLine,
          city: req.body.cdw_address.city,
          state: req.body.cdw_address.subdivision,
          postalCode: req.body.cdw_address.postalCode,
          country: "US",
        },
      },
      orderLines: [
        {
          lineNumber: "1",
          quantity: 1,
          unitPrice: req.body.unit_price,
          uom: "EA",
          cdwPartNumber: req.body.cdw_part_no,
        },
      ],
    };

    try {
      console.log(`/newPurchase/${client} => Placing CDW order.`);
      const cdw_resp = await placeCDWOrder(cdw_body);

      if (cdw_resp === "Error") {
        throw new Error("Error in placing CDW order.");
      } else if (cdw_resp !== "") {
        console.log(`/newPurchase/${client} => Successfully placed CDW order.`);
      } else {
        console.log(
          `/newPurchase/${client} => Nothing happened in placing CDW order.`
        );
      }
    } catch (e) {
      console.log(`/newPurchase/${client} => Error in placing CDW order.`);
      res.status(500).json({ status: "Error" });
    }
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

router.post("/missing", checkJwt, async (req, res) => {
  const { order_no, serial_no, device_name, name, client } = req.body;

  try {
    const row_vals = createMissingMappingRow(
      client,
      device_name,
      serial_no,
      name,
      order_no
    );

    const resp = await addOrderRow(
      row_vals,
      "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
      1613459136,
      6
    );
  } catch (e) {
    console.log("/missing => Error in listing missing device mapping:", e);
  }

  res.send("Hello World");
});

// router.post("/orderyubikey", async (req, res) => {
//   // const { firstname, lastname, address, email, phone_number } = body;
//   try {
//     const result = await createYubikeyShipment(req.body);
//     res.send("hello world");
//   } catch (e) {
//     console.log("error in ordering :::::::: ", e);
//   }
// });

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

const orderItemsDelivery = async (order, containerId, ups_token) => {
  console.log(
    `orderItemDelivery(${order.client}) => Starting function:`,
    order.id
  );

  if (order.shipping_status !== "Completed") {
    let change = false;
    let fedex_items = [];
    let index = 0;

    for await (const item of order.items) {
      if (item.courier) {
        if (item.courier.toLowerCase() === "fedex") {
          if (
            item.tracking_number?.length > 0 &&
            item.delivery_status !== "Delivered"
          ) {
            fedex_items.push({
              order_no: order.orderNo,
              full_name: order.full_name,
              item_index: index,
              tracking_no: item.tracking_number[0],
              id: order.id,
              items: order.items,
              containerId,
            });
          }
        } else if (item.courier.toLowerCase() === "ups") {
          if (
            item.tracking_number?.length > 0 &&
            item.delivery_status !== "Delivered"
          ) {
            const deliveryResult = await trackUPSPackage(
              item.tracking_number[0].trim(),
              ups_token
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

      index++;
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
        return { status: 200, data: updateDelivery, fedex_items: fedex_items };
      } catch (e) {
        console.log(
          `orderItemDelivery(${order.client}) => Error in updating delivery status of order:`,
          order.id
        );
        return { status: 500, data: "Error" };
      }
    } else {
      return { status: 200, data: "No Change", fedex_items: fedex_items };
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

const cdwHelperFunction = async (
  o,
  cdw_part_number,
  serial_no,
  tracking_no,
  carrier,
  date_shipped
) => {
  const item_keyword = cdw_to_item_name[cdw_part_number];
  let item_name = "";
  let items_changed = false;
  o.items.forEach((i) => {
    if (
      i.name.toLowerCase().includes(item_keyword) &&
      !Array.isArray(i.tracking_number)
    ) {
      items_changed = true;
      i.serial_number = serial_no;
      i.tracking_number = [tracking_no];
      i.courier = carrier;
      i.date_shipped = date_shipped;
      item_name = i.name;
    }
  });
  if (items_changed) {
    const replaced = await orders.updateOrderByContainer(
      "Received",
      o.id,
      o.full_name,
      o.items
    );
    console.log("cdwHelperFunction() => Successfully updated order.");
    return {
      item_name,
      first_name: o.firstName,
      last_name: o.lastName,
      full_name: o.full_name,
      email: o.email,
      order_no: o.orderNo,
    };
  } else {
    console.log("cdwHelperFunction() => Nothing to update.");
    return "";
  }
};

const cdwUpdateOrder = async (
  client,
  order_no,
  serial_no,
  tracking_no,
  cdw_part_number,
  carrier,
  date_shipped
) => {
  console.log(`cdwUpdateOrder(${order_no}) => Starting function: ${client}.`);
  if (!isNaN(order_no)) {
    const parsed_order_no = parseInt(order_no);

    try {
      console.log(
        `cdwUpdateOrder(${order_no}) => Checking Received container.`
      );
      const all_received = await orders.getAllReceived();

      if (all_received.length > 0) {
        for await (let o of all_received) {
          if (o.orderNo === parsed_order_no) {
            console.log(
              `cdwUpdateOrder(${order_no}) => Matched order in received container.`
            );
            const helper_res = await cdwHelperFunction(
              o,
              cdw_part_number,
              serial_no,
              tracking_no,
              carrier,
              date_shipped
            );
            console.log(
              `cdwUpdateOrder(${order_no}) => Update response here: `,
              helper_res
            );
            return helper_res;
          }
        }
      }
      if (client !== "") {
        console.log(
          `cdwUpdateOrder(${order_no}) => Checking ${client} container.`
        );
        const all_orders = await orders.getAllOrders(client);

        if (all_orders.length > 0) {
          for await (let o of all_orders) {
            if (o.orderNo === parsed_order_no) {
              console.log(
                `cdwUpdateOrder(${order_no}) => Matched order in ${client} container.`
              );
              const helper_res = await cdwHelperFunction(
                o,
                cdw_part_number,
                serial_no,
                tracking_no,
                carrier,
                date_shipped
              );
              console.log(
                "cdwUpdateOrder() => Update response here: ",
                helper_res
              );
              return helper_res;
            }
          }
        }
      }
      return "";
    } catch (e) {
      console.log(`cdwUpdateOrder() => Error in function:`, e);
      return "";
    }
  } else {
    console.log("cdwUpdateOrder() => Order number is not a number:", order_no);
    return "";
  }
};

export default router;

export {
  addMarketplaceOrder,
  updateMarketplaceFile,
  marketplaceSentApprovalEmail,
  resetMockApprovals,
  createOrdersContainer,
  addNewDocument,
  cdwUpdateOrder,
};
