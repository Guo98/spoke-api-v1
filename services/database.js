async function setOrders(db, customerInfo) {
  //  const orders = Orders();
  const result = await db.addItem(customerInfo);
  console.log("db results :::::::: ", result);
}

async function updateOrders(db) {}

export { setOrders, updateOrders };
