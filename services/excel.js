import excelJS from "exceljs";
import { Blob } from "node:buffer";

async function exportInventory(res, devices) {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventory");
  const path = "./Downloads";

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
  // console.log("in here ::::::::: ", devices);
  try {
    // const data = await workbook.xlsx
    //   .writeFile(`${path}/inventory.xlsx`)
    //   .then(() => {
    //     console.log("should be successful >>>>>>>>>>>");
    //     res.send({
    //       status: "Success",
    //       path: `${path}/inventory.xlsx`,
    //     });
    //   });
    const respdata = await workbook.xlsx.writeBuffer().then((resp) => {
      //   const blob = new Blob([resp], {
      //     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      //   });
      //   console.log("buffer ::::::::: ", blob);
      //   saveAs(blob, "inventory.xlsx");
      res.send({ status: "Success", data: resp });
    });
  } catch (e) {
    console.log("error ::::::::: ", e);
    res.send({ status: "Error" });
  }
}

export { exportInventory };
