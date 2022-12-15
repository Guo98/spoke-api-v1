import Airtable from "airtable";
import {
  baseIds,
  deployedTables,
  inventoryOverview,
  inventoryTables,
  orderTables,
  overviewRecords,
} from "../utils/airtableConstants.js";
import { euCodes } from "../utils/constants.js";

// on hold status -> send email to info email of out of stock
async function createRecord(customerInfo, client) {
  const {
    items,
    address: { country } = "",
    orderNo,
    firstName,
    lastName,
  } = customerInfo;
  console.log(`createRecord(${orderNo}) => Starting function.`);
  let constantField = "";
  switch (client) {
    case "FLYR":
      constantField = "flyr";
      break;
    case "NurseDash":
      constantField = "nursedash";
      break;
    case "Bowery":
      constantField = "bowery";
      break;
    default:
      constantField = "";
      break;
  }
  if (constantField !== "") {
    let base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      baseIds[constantField]
    );
    let workplaceList = [];
    let status = "";
    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        workplaceList.push(item.name);
        if (item.type === "laptop") {
          console.log(
            `createRecord(${orderNo}) => Adding laptop record: ${item.name} and starting updateInventory function.`
          );
          const recordId = await updateInventory(
            base,
            item,
            constantField,
            country
          );
          console.log(
            `createRecord(${orderNo}) => Finished updateInventory function with result: ${recordId}`
          );
          if (recordId === "") {
            status = "On Hold";
          } else {
            console.log(
              `createRecord(${orderNo}) => Updating delpoyed table with laptop: ${item.name}`
            );
            if (country === "USA") {
              items[i].supplier = "CTS";
            }
            base(deployedTables[constantField]).create(
              [
                {
                  fields: {
                    "Order No.": orderNo,
                    "Order Date": new Date().toISOString().slice(0, 10),
                    Recipient: firstName + " " + lastName,
                    Item: item.name,
                    Status: "Processing",
                    Location: getCountryCode(country),
                  },
                },
              ],
              { typecast: true },
              (err, records) => {
                if (err) {
                  console.log(
                    `createRecord(${orderNo}) => error in updating deployed table: ${err}`
                  );
                  return;
                }

                records.forEach((record) => {
                  console.log(
                    `createRecord(${orderNo}) => Successfully updated deployed table: ${record.getId()}`
                  );
                });
              }
            );
            console.log(
              `createRecord(${orderNo}) => Finished updating deployed table.`
            );
          }
        }
      }

      try {
        console.log(`createRecord(${orderNo}) => Starting addOrders function.`);
        await addOrders(
          base,
          customerInfo,
          workplaceList,
          status,
          constantField
        );
        console.log(`createOrders(${orderNo}) => Finished addOrders function.`);
      } catch (err) {
        console.log(
          `createRecord(${orderNo}) => Error in addOrders function: ${err}`
        );
      }
    }

    console.log(`createRecord(${orderNo}) => Ending function.`);
  }
}

async function addOrders(base, customerInfo, items, status, tableCode) {
  const {
    orderNo,
    firstName,
    lastName,
    address: { country } = "",
  } = customerInfo;
  console.log(`addOrders(${orderNo}) => Starting function.`);
  base(orderTables[tableCode]).create(
    [
      {
        fields: {
          "Order No": orderNo,
          "Order Date": new Date().toISOString().slice(0, 10),
          Recipient: firstName + " " + lastName,
          Items: items,
          Status: status || "Order Received",
          Location: getCountryCode(country),
        },
      },
    ],
    { typecast: true },
    (err, records) => {
      if (err) {
        console.log(
          `addOrders(${orderNo}) => Error in adding record to order overview table: ${err}`
        );
        return;
      }
      records.forEach((record) => {
        console.log(
          `addOrders(${orderNo}) => Successfully added record to order overivew table: ${record.getId()}`
        );
      });
    }
  );
}

async function updateInventory(base, laptop, tableCode, country) {
  console.log(`updateInventory(${laptop.name}) => Starting function.`);
  const records = await base(inventoryTables[tableCode])
    .select({ view: "Grid view" })
    .firstPage();
  let recordId = "";

  for (let i = 0; i < records.length; i++) {
    const recLocation = records[i].fields.Location;
    if (
      records[i].fields.Item.split("(")[0] === laptop.name.split("(")[0] &&
      records[i].fields.Status === "In Stock" &&
      ((recLocation === "US" && country === "USA") ||
        (euCodes.indexOf(country) > -1 && recLocation === "EU") ||
        (country === "GBR" && recLocation === "UK") ||
        (recLocation === "Other" &&
          country !== "GBR" &&
          country !== "USA" &&
          euCodes.indexOf(country) < 0))
    ) {
      console.log(
        `updateInventory(${laptop.name}) => Found a match in existing inventory.`
      );
      recordId = records[i].id;
      break;
    }
  }

  if (recordId === "") {
    console.log(
      `updateInventory(${laptop.name}) => No match was found in existing inventory.`
    );
  }

  if (recordId !== "") {
    const updateLaptopList = records.filter(
      (record) => record.fields.Item === laptop.name
    );

    if (overviewRecords[tableCode][laptop.name]) {
      console.log(
        `updateInventory(${laptop.name}) => Updating inventory overview table.`
      );
      base(inventoryOverview[tableCode]).update(
        [
          {
            id: overviewRecords[tableCode][laptop.name],
            fields: {
              Quantity: updateLaptopList.length - 1,
            },
          },
        ],
        (err, records) => {
          if (err) {
            console.log(
              `updateInventory(${laptop.name}) => Error in updating Inventory Overview Table: ${err}`
            );
            return;
          }
          records.forEach((record) => {
            console.log(
              `updateInventory(${
                laptop.name
              }) => Successfully updated record in Inventory Overview table: ${record.getId()}`
            );
          });
        }
      );
    }
  }
  // delete
  if (recordId !== "") {
    console.log(
      `updateInventory(${laptop.name}) => Deleting laptop from inventory table.`
    );
    base(inventoryTables[tableCode]).destroy([recordId], (err, records) => {
      if (err) {
        console.log(
          `updateInventory(${laptop.name}) => Error in deleting laptop record: ${err}`
        );
        return;
      }
      records.forEach((record) => {
        console.log(
          `updateInventory(${
            laptop.name
          }) => Successfully deleted laptop record: ${record.getId()}`
        );
      });
    });
  }

  return recordId;
}

function getCountryCode(wixCountryCode) {
  let result = "Other";
  if (wixCountryCode === "USA") {
    result = "US";
  } else if (wixCountryCode === "GBR") {
    result = "UK";
  } else if (euCodes.indexOf(wixCountryCode) > -1) {
    result = "EU";
  }

  return result;
}

export { createRecord };
