import Airtable from "airtable";
import { baseIds } from "../utils/airtableConstants.js";

// on hold status -> send email to info email of out of stock
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
        console.log("createRecord() => Adding swag record.");
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
        console.log("createRecord() => Adding laptop record.");
        const recordId = await updateInventory(base, item);
        if (recordId === "") {
          item.status = "On Hold";
        }
        await updateLaptopAndDeployed(base, customerInfo, item);
      }
    });
  }

  if (workplaceList.length > 0) {
    console.log("createRecord() => Adding workplace records.");
    await addToWorkspace(base, workplaceList);
  }

  console.log("createRecord() => Ending function.");
}

async function addToSwag(base, obj) {
  return base("Swag").create(obj, (err, records) => {
    if (err) {
      console.log("addToSwag() => Error in adding record: ", err);
      return;
    }
    records.forEach((record) => {
      console.log("addToSwag() => Successfully added record: ", record.getId());
    });
  });
}

async function addToWorkspace(base, obj) {
  return base("Workplace").create(obj, (err, records) => {
    if (err) {
      console.log("addToWorkspace() => Error in adding records: ", err);
      return;
    }
    records.forEach((record) => {
      console.log(
        "addToWorkspace() => Successfully added record: ",
        record.getId()
      );
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
          "Laptop Status": laptop.status || "Order Received",
          Location: laptop.location,
        },
      },
    ],
    (err, records) => {
      if (err) {
        console.log(
          "updateLaptopAndDeployed() => Error in adding record to laptops table: ",
          err
        );
        return;
      }
      records.forEach((record) => {
        console.log(
          "updateLaptopAndDeployed() => Successfully added record to laptops table: ",
          record.getId()
        );
      });
    }
  );
  if (!laptop.status) {
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
          console.log(
            "updateLaptopAndDeployed() => Error in adding record to deployed table: ",
            err
          );
          return;
        }
        records.forEach((record) => {
          console.log(
            "updateLaptopAndDeployed() => Successfully added record to deployed table: ",
            record.getId()
          );
        });
      }
    );
  }
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
  // delete
  if (recordId !== "") {
    base("Inventory").destroy([recordId], (err, records) => {
      if (err) {
        console.log("updateInventory() => Error in updating record: ", err);
        return;
      }
      records.forEach((record) => {
        console.log(
          "updateInventory() => Successfully updated record: ",
          record.getId()
        );
      });
    });
  }

  return recordId;
}

export { createRecord };
