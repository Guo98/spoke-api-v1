import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { getEmailId } from "../services/gmail.js";
import { config } from "../utils/config.js";
import { Orders } from "../models/orders.js";
import { setOrders } from "../services/database.js";
import { mapLineItems } from "../utils/mapItems.js";
import { addOrderRow } from "../services/googleSheets.js";
import { createRecord } from "../services/airtable.js";
import { basicAuth } from "../services/basicAuth.js";

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
        const resp = await addOrderRow(
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

// router.post("/updateOrder", async (req, res) => {});

export default router;
