import excelJS from "exceljs";
import { Blob } from "node:buffer";

async function exportInventory(res, devices) {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventory");

  worksheet.columns = [
    { header: "Device Name", key: "name", width: 10 },
    { header: "Serial Number", key: "sn", width: 10 },
    { header: "Condition", key: "condition", width: 10 },
    { header: "Grade", key: "grade", width: 10 },
    { header: "Location", key: "location", width: 10 },
  ];

  devices.forEach((device) => {
    worksheet.addRow(device);
  });

  try {
    const respdata = await workbook.xlsx.writeBuffer();

    res.send({ status: "Success", data: respdata });
  } catch (e) {
    res.send({ status: "Error" });
  }
}

async function exportOrders(res, orders) {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventory");

  worksheet.columns = [
    { header: "Order Number", key: "orderNo", width: 10 },
    { header: "Name", key: "name", width: 10 },
    { header: "Items", key: "items", width: 10 },
  ];

  orders.forEach((order) => {
    worksheet.addRow(order);
  });

  try {
    const respdata = await workbook.xlsx.writeBuffer();

    res.send({ status: "Success", data: respdata });
  } catch (e) {
    res.send({ status: "Error" });
  }
}

export { exportInventory, exportOrders };
