import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { getTrackingNumber } from "../utils/emailParser.js";
import { getEmailId } from "../services/gmail.js";
import { config } from "../utils/config.js";
import { Orders } from "../models/orders.js";
import { setOrders } from "../services/database.js";

const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});

const orders = new Orders(cosmosClient, "ToDoList", "Items");

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
  console.log("reaches this here :::: ", historyData);

  if (historyData.historyId) await getEmailId(historyData.historyId);
  getTrackingNumber();
  res.send("Hello World!");
});

/**
 * @param {string} body.customer_name
 * @param {string} body.customer_address
 * @param {Array} body.orders
 * @param {Number} body.order_no
 */
router.post("/createOrder", async (req, res) => {
  const customerInfo = req.body;
  await setOrders(orders, customerInfo);
  res.send("Creating order");
});

export default router;
