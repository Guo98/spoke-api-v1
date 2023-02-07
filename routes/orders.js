import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { getEmailId } from "../services/gmail.js";
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
import { determineContainer } from "../utils/utility.js";
import { exportOrders } from "../services/excel.js";

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
//   const receivedOrders = await orders.getAllReceived();
//   const updateItems = await getEmailBody(messageId, orders);
//   console.log("update items ::::::::: ", updateItems);
//   if (updateItems && updateItems[0]) {
//     await orders.updateOrder(updateItems[0], updateItems[1]);
//   }
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
    const mappedInfo = mapLineItems(customerInfo);

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

router.get("/getAllOrders/:company", checkJwt, async (req, res) => {
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
    default:
      break;
  }

  console.log(`/getAllOrders/${company} => Starting route.`);

  const querySpec = {
    query: "SELECT * FROM Received r WHERE r.client = @client",
    parameters: [
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
      const ordersRes = await orders.getAllOrders(dbContainer);
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

router.get("/downloadorders/:client", checkJwt, async (req, res) => {
  let containerId = determineContainer(req.params.client);
  console.log(`/downloadorders/${req.params.client} => Starting route.`);
  try {
    console.log(`/downloadorders/${req.params.client} => Getting all orders.`);

    const querySpec = {
      query: "SELECT * FROM Received r WHERE r.client = @client",
      parameters: [
        {
          name: "@client",
          value: req.params.client,
        },
      ],
    };

    if (containerId !== "") {
      const ordersRes = await orders.getAllOrders(containerId);
      ordersRes.forEach((order) => {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;
      });

      const inProgRes = await orders.find(querySpec);
      inProgRes.forEach((order) => {
        delete order._rid;
        delete order._self;
        delete order._etag;
        delete order._attachments;
        delete order._ts;
      });

      let allOrders = [];

      ordersRes.forEach((order) => {
        const items = order.items.map((item) => item.name);
        allOrders.push({
          orderNo: order.orderNo,
          name: order.firstName + " " + order.lastName,
          items: items.length > 1 ? items.join(", ") : items[0],
        });
      });

      inProgRes.forEach((order) => {
        const items = order.items.map((item) => item.name);
        allOrders.push({
          orderNo: order.orderNo,
          name: order.firstName + " " + order.lastName,
          items: items.length > 1 ? items.join(", ") : items[0],
        });
      });

      console.log(
        `/downloadorders/${req.params.client} => Got list of all orders.`
      );

      await exportOrders(res, allOrders, req.params.client);
    }
  } catch (e) {
    console.log(
      `/downloadorders/${req.params.client} => Error in getting all orders.`
    );
    if (!res.headersSent) res.status(500).send({ status: "Error in here" });
  }
  // res.send("Hello World!");
  console.log(`/downloadorders/${req.params.client} => Ending route.`);
});

export default router;
