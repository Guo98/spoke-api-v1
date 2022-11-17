import Airtable from "airtable";
import { baseIds } from "../utils/airtableConstants.js";

async function createRecord(customerInfo) {
  const { items, orderNo, firstName, lastName } = customerInfo;
  console.log("createRecord() => Starting function.");
  let base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    baseIds.test
  );
  let workplaceList = [];
  if (items.length > 0) {
    items.forEach(async (item) => {
      if (item.name === "FLYR Swag Pack") {
        const swagObj = [
          {
            fields: {
              "Order No": orderNo,
              "Order Date": new Date().toISOString().slice(0, 10),
              Recipient: firstName + " " + lastName,
              Item: item.name,
              "Workplace Stipend": 0,
              Status: "Order Received",
              Location: "US",
            },
          },
        ];
        await addToSwag(base, swagObj);
      } else if (!item.type) {
        workplaceList.push({
          fields: {
            "Order No": orderNo,
            "Order Date": new Date().toISOString().slice(0, 10),
            Recipient: firstName + " " + lastName,
            Item: item.name,
            "Workplace Stipend": 0,
            Status: "Order Received",
            Location: "US",
          },
        });
      } else if (item.type === "laptop") {
        await updateInventory(base, item);
        await updateLaptopAndDeployed(base, customerInfo, item);
      }
    });
  }

  if (workplaceList.length > 0) {
    await addToWorkspace(base, workplaceList);
  }

  console.log("createRecord() => Ending function.");
}

async function addToSwag(base, obj) {
  return base("Swag").create(obj, (err, records) => {
    if (err) {
      console.error(err);
      return;
    }
    records.forEach((record) => {
      console.log(record.getId());
    });
  });
}

async function addToWorkspace(base, obj) {
  return base("Workplace").create(obj, (err, records) => {
    if (err) {
      console.error(err);
      return;
    }
    records.forEach((record) => {
      console.log(record.getId());
    });
  });
}

async function updateLaptopAndDeployed(base, customerInfo, laptop) {
  const { orderNo, firstName, lastName } = customerInfo;
  base("Laptops").create(
    [
      {
        fields: {
          "Order No": orderNo,
          "Order Date": new Date().toISOString().slice(0, 10),
          Recipient: firstName + " " + lastName,
          Laptop: laptop.name,
          "Workplace Stipend": 0,
          "Laptop Status": "Order Received",
          Location: laptop.location,
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

  base("Deployed").create(
    [
      {
        fields: {
          "Order No": orderNo,
          "Order Date": new Date().toISOString().slice(0, 10),
          Recipient: firstName + " " + lastName,
          Item: laptop.name,
          Status: "Order Received",
          Location: laptop.location,
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
}

async function updateInventory(base, laptop) {
  const records = await base("Inventory")
    .select({ view: "Grid view" })
    .firstPage();
  let recordId = "";

  for (let i = 0; i < records.length; i++) {
    if (
      records[i].fields.Item === laptop.name &&
      records[i].fields.Status === "In Stock"
    ) {
      recordId = records[i].id;
      break;
    }
  }

  const updatedRecord = await base("Inventory").update([
    {
      id: recordId,
      fields: {
        Status: "In Transit",
      },
    },
  ]);

  return recordId;
}

export { createRecord };
