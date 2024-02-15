import { AfterShip } from "aftership";

const aftership = new AfterShip(process.env.AFTERSHIP_API_KEY);

function determineAftershipNumber(name) {
  if (name === "Returning" || name === "Offboarding") {
    return "Equipment Return Box";
  } else if (name.indexOf('"') > -1) {
    return item.name.split('"')[0];
  } else {
    return name;
  }
}

function createAftershipCSV(customerInfo) {
  let csvRows = [
    "courier,tracking_number,email,title,customer_name,order_number,language",
  ];

  customerInfo.forEach((row) => {
    const csvRow = `,${row.tracking_number},${row.email},${row.title},${row.customer_name},${row.order_number},en`;
    csvRows.push(csvRow);
  });

  return customerInfo.length > 0 ? btoa(csvRows.join("\n")) : "";
}

async function createAftershipTracking(customer_info) {
  customer_info.forEach(async (row) => {
    const tracking_payload = {
      tracking: {
        tracking_number: row.tracking_number,
        title: row.title,
        emails: row.email,
        customer_name: row.customer_name,
        order_number: determineAftershipNumber(row.order_number),
      },
    };
    try {
      console.log(
        `createAftershipTracking(${row.title}) => Starting createTracking function.`
      );
      const aftership_result = await aftership.tracking.createTracking(
        tracking_payload
      );
      console.log(
        `createAftershipTracking(${row.title}) => Successfully created tracking.`,
        aftership_result
      );
    } catch (e) {
      console.log(
        `createAftershipTracking(${row.title}) => Error in creating tracking:`,
        e
      );
    }
  });
}

export { createAftershipCSV, createAftershipTracking };
