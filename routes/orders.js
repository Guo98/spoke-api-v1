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
    case "FLYR":
      dbContainer = "FLYR";
      client = "FLYR";
      break;
    default:
      break;
  }

  console.log(`/getAllOrders/${company} => Starting route.`);

  const querySpec = {
    query:
      "SELECT * FROM Received r WHERE r.client = @client AND r.address.country = @country",
    parameters: [
      {
        name: "@client",
        value: client,
      },
      {
        name: "@country",
        value: "USA",
      },
    ],
  };

  if (dbContainer !== "") {
    try {
      console.log(
        `/getAllOrders/${company} => Getting all orders from container: ${dbContainer}`
      );
      const ordersRes = await orders.getAllOrders(dbContainer);
      const filteredRes = ordersRes.filter(
        (order) => order.address.country === "USA"
      );
      filteredRes.forEach((order) => {
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
      res.json({ data: { in_progress: inProgRes, completed: filteredRes } });
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
    let client = "";
    switch (req.params.client) {
      case "public":
        client = "Public";
        break;
      case "FLYR":
        client = "FLYR";
        break;
      default:
        client = req.params.client;
        break;
    }

    const querySpec = {
      query:
        "SELECT * FROM Received r WHERE r.client = @client AND r.address.country = @country",
      parameters: [
        {
          name: "@client",
          value: client,
        },
        ,
        {
          name: "@country",
          value: "USA",
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
          if (order.address.country === "USA") {
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
  if (status === "Completed") {
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
  } else {
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
  }

  if (!res.headersSent) res.json({ status: "Success" });
  console.log(`/updateTrackingNumber/${client} => Ending route.`);
});

router.post("/completeOrder", async (req, res) => {
  const { client, id, full_name } = req.body;
  console.log(`/completeOrder/${client} => Starting route.`);
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
      const updateResp = await orders.completeOrder(client, req.body);
      console.log(
        `/completeOrder/${client} => Finished adding order to ${client} container`
      );
    } catch (e) {
      console.log(
        `/completeOrder/${client} => Error in adding order to ${client} container`
      );
      res.status(500).json({ status: "Error in moving to container" });
    }
  }
  console.log(`/completeOrder/${client} => Ending route.`);
  if (!res.headersSent) res.json({ status: "Success" });
});

export default router;
