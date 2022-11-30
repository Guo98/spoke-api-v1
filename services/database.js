async function setOrders(db, customerInfo) {
  //  const orders = Orders();
  customerInfo.shipping_status = "Incomplete";
  const result = await db.addItem(customerInfo);
  // console.log("db results :::::::: ", result);
}

async function updateOrders(db) {}

export { setOrders, updateOrders };
