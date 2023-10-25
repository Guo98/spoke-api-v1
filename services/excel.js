import excelJS from "exceljs";
import { Blob } from "node:buffer";

async function exportInventory(res, devices) {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventory");

  worksheet.columns = [
    { header: "Device Name", key: "name", width: 30 },
    { header: "Serial Number", key: "sn", width: 15 },
    { header: "Condition", key: "condition", width: 10 },
    { header: "Grade", key: "grade", width: 10 },
    { header: "Location", key: "location", width: 10 },
    { header: "Status", key: "status", width: 10 },
    { header: "Date Deployed", key: "date_deployed", width: 20 },
    { header: "Name", key: "full_name", width: 20 },
    {
      header: "Entity",
      key: "entity",
      width: 20,
    },
  ];

  devices.forEach((device) => {
    worksheet.addRow(device);
  });

  try {
    const respdata = await workbook.xlsx.writeBuffer();

    res.send({ status: "Success", data: respdata });
  } catch (e) {
    res.send({ status: "Error writing buffer" });
  }
}

async function exportOrders(res, orders, client) {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet("Orders");

  if (Object.keys(orders[orders.length - 1]).includes("entity")) {
    worksheet.columns = [
      { header: "Order Number", key: "orderNo", width: 10 },
      { header: "Name", key: "name", width: 20 },
      { header: "Item", key: "item", width: 30 },
      { header: "Serial Number", key: "serial_no", width: 15 },
      { header: "Date Ordered", key: "date", width: 20 },
      { header: "Location", key: "location", widht: 30 },
      { header: "Entity", key: "entity", widht: 30 },
      { header: "Price", key: "price", width: 10 },
      { header: "Spoke Fees", key: "spoke_fee", width: 10 },
    ];
  } else {
    worksheet.columns = [
      { header: "Order Number", key: "orderNo", width: 10 },
      { header: "Name", key: "name", width: 20 },
      { header: "Item", key: "item", width: 30 },
      { header: "Serial Number", key: "serial_no", width: 15 },
      { header: "Date Ordered", key: "date", width: 20 },
      { header: "Location", key: "location", widht: 30 },
      { header: "Price", key: "price", width: 10 },
      { header: "Spoke Fees", key: "spoke_fee", width: 10 },
    ];
  }

  orders.forEach((order) => {
    worksheet.addRow(order);
  });

  try {
    console.log(`/downloadorders/${client} => Writing all orders as a buffer.`);
    const respdata = await workbook.xlsx.writeBuffer();
    console.log(
      `/downloadorders/${client} => Finished writing all orders as a buffer.`
    );
    res.send({ status: "Success", data: respdata });
  } catch (e) {
    console.log(
      `/downloadorders/${client} => Error in writing all orders as a buffer.`
    );
    res.send({ status: "Error writing buffer" });
  }
}

export { exportInventory, exportOrders };
