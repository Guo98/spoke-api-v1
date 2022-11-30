import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { getTrackingNumber } from "../utils/emailParser.js";
import { getEmailId, getEmailBody } from "../services/gmail.js";
import { config } from "../utils/config.js";
import { Orders } from "../models/orders.js";
import { setOrders } from "../services/database.js";
import { mapLineItems } from "../utils/mapItems.js";
import { addOrderRow } from "../services/googleSheets.js";
import { createRecord } from "../services/airtable.js";

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
  // console.log("reaches here ::::::: ", req.body);
  const historyData = JSON.parse(atob(req.body.message.data));
  console.log("reaches this here :::: ", historyData);

  if (historyData.historyId) await getEmailId(historyData.historyId);
  // getTrackingNumber();
  res.send("Hello World!");
});

router.get("/getMessage/:messageid", async (req, res) => {
  const messageId = req.params.messageid;
  const receivedOrders = await orders.getAllReceived();
  const updateItems = await getEmailBody(messageId, receivedOrders);

  await orders.updateOrder(updateItems[0], updateItems[1]);
  res.send("Hello world email!");
});

/**
 * @param {string} body.customer_name
 * @param {string} body.customer_address
 * @param {Array} body.orders
 * @param {Number} body.order_no
 */
router.post("/createOrder", async (req, res) => {
  console.log("/createOrder => Starting route. ");
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
    // const resp = await addOrderRow(
    //   orderNo,
    //   client,
    //   firstName + " " + lastName,
    //   email,
    //   items[i].name,
    //   items[i].price,
    //   address,
    //   phone,
    //   note,
    //   items[i].variant,
    //   items[i].supplier
    // );
  }
  // console.log("/createOrder => Adding order to airtable.");
  //await createRecord(customerInfo);
  console.log("/createOrder => Adding order to Orders db.");
  // await setOrders(orders, mappedInfo);
  console.log("/createOrder => Ending route.");
  res.send("Creating order");
});

router.post("/updateOrder", async (req, res) => {});

export default router;
