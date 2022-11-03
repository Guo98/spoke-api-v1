import { Orders } from "../models/orders.js";

async function setOrders(db, customerInfo) {
  //  const orders = Orders();
  const result = await db.addItem(customerInfo);
  console.log("db results :::::::: ", result);
}

export { setOrders };
