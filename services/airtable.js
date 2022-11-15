import Airtable from "airtable";
import { baseIds } from "../utils/airtableConstants.js";

async function createRecord(customerInfo, item) {
  let base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    baseIds.test
  );
  console.log("customer info :::::::: ", customerInfo);
  await retrieveRecord(base);
  base("Table 1").create(
    [
      {
        fields: {
          "Order No": customerInfo.orderNo,
          "Order Date": new Date().toISOString().slice(0, 10),
          Recipient: customerInfo.firstName + " " + customerInfo.lastName,
          Laptop: item.name,
          "Workplace Stipend": 0,
          "Laptop Status": "Shipped",
          Location: item.location,
        },
      },
    ],
    (err, records) => {
      if (err) {
        console.error(err);
        return;
      }
      records.forEach((record) => {
        console.log(record.getId());
      });
    }
  );

  // take one from inventory, add one to deployed, subtract from inventory overview
}

async function retrieveRecord(base) {
  let inStockLaptops = [];
  await base("Inventory")
    .select({ view: "Grid view" })
    .firstPage((err, records) => {
      if (err) {
        console.error("err :::: ", err);
        return;
      }

      records.forEach(function (record) {
        console.log("Retrieved ::::::: ", record.get("Item"));
        if (inStockLaptops.indexOf(record.get("Item")) < -1) {
          inStockLaptops.push(record.get("Item"));
        }
      });
    });

  console.log("in stock laptops :::::: ", inStockLaptops);
}

export { createRecord, retrieveRecord };
