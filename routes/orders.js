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
import { sendSupportEmail } from "../services/sendEmail.js";
import {
  sendMarketplaceRequestEmail,
  sendMarketplaceResponse,
} from "../services/emails/marketplace.js";
import { determineContainer } from "../utils/utility.js";
import { exportOrders } from "../services/excel.js";
import { createYubikeyShipment } from "../utils/yubikey.js";

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

router.get("/getAllOrders/:company/:entity?", checkJwt, async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
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

  console.log(`/getAllOrders/${company} => Starting route.`);

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
        `/getAllOrders/${company} => Getting all orders from container: ${dbContainer}`
      );
      let ordersRes = await orders.getAllOrders(dbContainer);

      if (req.params.entity) {
        ordersRes = ordersRes.filter(
          (order) => order.entity === req.params.entity
        );
      }
      ordersRes.forEach((order) => {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;
      });
      console.log(
        `/getAllOrders/${company} => Finished getting all orders from container: ${dbContainer}`
      );

      console.log(
        `/getAllOrders/${company} => Getting all in progress orders for company: ${client}`
      );
      const inProgRes = await orders.find(querySpec);
      inProgRes.forEach((order) => {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;
      });
      console.log(
        `/getAllOrders/${company} => Finished getting all in progress orders for company: ${client}`
      );
      res.json({ data: { in_progress: inProgRes, completed: ordersRes } });
    } catch (e) {
      console.log(
        `/getAllOrders/${company} => Error in getting all orders: ${e}`
      );
      res.status(500).json({ status: "Error in getting info" });
    }
  } else {
    console.log(`/getAllOrders/${company} => Company doesn't exist in DB.`);
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
          `/completeOrder/${client} => Updating order status in ${client} container.`
        );
        req.body.shipping_status = "Completed";
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
    device_type,
    specs,
    color,
    notes: { device, recipient },
    order_type,
    recipient_name,
    address,
    email,
    phone_number,
    shipping_rate,
    requestor_email,
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

  if (req.body.includeYubikey) {
    try {
      console.log(
        `/newPurchase/${client} => Requesting yubikeys for: `,
        recipient_name
      );
      // const yubikeyResp = await createYubikeyShipment(req.body);
      console.log(
        `/newPurchase/${client} => Finished requesting yubikeys for:`,
        recipient_name
      );
    } catch (e) {
      console.log(
        `/newPurchase/${client} => Error in requesting yubikeys: ${e}. For: ${recipient_name}`
      );
      // res.status(500).json({ status: "Error" });
    }
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

router.get("/getmarketplace/:client?", checkJwt, async (req, res) => {
  console.log("/getmarketplace => Starting route.");
  try {
    console.log("/getmarketplace => Getting all orders from marketplace.");
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
    console.log("/getmarkatplace => Got all orders from marketplace.");
    res.json({ status: "Successful", data: orderRes });
  } catch (e) {
    console.log(
      `/getmarketplace => Error in getting all marketplace orders: ${JSON.stringify(
        e
      )}`
    );
    res.status(500).json({ status: "Error" });
  }
  console.log("/getmarketplace => Finished route.");
});

router.post("/updateMarketOrder", checkJwt, async (req, res) => {
  console.log("/updateMarketOrder => Starting route.");
  try {
    console.log("/updateMarketOrder => Starting update db function.");
    if (req.body.status) {
      const updateRes = await orders.updateMarketOrder(
        req.body.id,
        req.body.client,
        req.body.status
      );
    } else if (req.body.price) {
      const updateRes = await orders.updateMarketOrder(
        req.body.id,
        req.body.client,
        "",
        "",
        req.body.price
      );
    } else if (req.body.approved !== undefined) {
      const updateRes = await orders.updateMarketOrder(
        req.body.id,
        req.body.client,
        "",
        "",
        "",
        req.body.approved
      );
    } else if (req.body.updateClient) {
      const updateRes = await orders.updateMarketplaceClient(
        req.body.id,
        req.body.updateClient
      );
    } else if (req.body.entity) {
      const updateRes = await orders.updateMarketOrder(
        req.body.id,
        req.body.client,
        "",
        "",
        "",
        "",
        req.body.entity
      );
    } else if (req.body.requestor_email) {
      const updateRes = await orders.updateMarketOrder(
        req.body.id,
        req.body.client,
        "",
        "",
        "",
        "",
        "",
        req.body.requestor_email
      );
    }
    console.log("/updateMarketOrder => Finished update db function.");
  } catch (e) {
    console.log("/updateMarketOrder => Error in updating db: ", e);
    res.status(500).json({ status: "Error" });
  }
  console.log("/updateMarketOrder => Finished route.");
  if (!res.headersSent) res.json({ status: "Successful" });

  if (req.body.approved !== undefined) {
    try {
      await sendMarketplaceResponse(req.body);
      console.log(
        `/updateMarketOrder => Successfully sent approval/denial email.`
      );
    } catch (e) {
      console.log(
        `/updateMarketOrder => Error in sending approval/denial email: `,
        e
      );
    }
  }
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

// router.get("/testyubikey", async (req, res) => {
//   const result = await checkYubikeyQuantity();
//   res.send({ result });
// });

const addMarketplaceOrder = async (request) => {
  await orders.addOrderByContainer("Marketplace", {
    ...request,
    status: "Received",
  });
};

const updateMarketplaceFile = async (id, client, filename) => {
  await orders.updateMarketOrder(id, client, "", filename);
};

const marketplaceSentApprovalEmail = async (id, client) => {
  await orders.sentMarketplaceEmail(id, client);
};

export default router;

export {
  addMarketplaceOrder,
  updateMarketplaceFile,
  marketplaceSentApprovalEmail,
};
