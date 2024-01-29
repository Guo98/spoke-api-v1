import { load } from "cheerio";
import determineTrackingNumber from "../common/tracking.js";
import { insightProductMappings, aftershipMappings } from "./constants.js";
import { autoAddNewSerialNumber } from "../../../routes/inventory.js";
import {
  createAftershipCSV,
  createAftershipTracking,
} from "../../../services/aftership.js";
import { sendAftershipCSV } from "../../../services/sendEmail.js";

export default async function parseInsight(message, orders, index) {
  const orderNum = orders[index].orderNo;
  console.log(`parseInsight(${orderNum}) => Starting function.`);
  let courier = "";
  let tracking_number = "";

  let serial_number = "";
  let insight_order_no = "";
  let insight_product_name = "";

  let aftershipArray = [];

  let device_name = "";
  console.log(`parseInsight(${orderNum}) => Getting tracking number.`);
  const tn_result = determineTrackingNumber(message, orderNum);

  if (tn_result) {
    console.log(
      `parseInsight(${orderNum}) => Got tracking result:`,
      tn_result.tracking_number
    );
    courier = tn_result.courier;
    tracking_number = tn_result.tracking_number;
  }

  const $ = load(message);

  $("td").each((index, element) => {
    const data_trim = $(element).text().trim();
    if (data_trim.toLowerCase().includes("serial #")) {
      serial_number = data_trim
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")[2];
    } else if (data_trim.toLowerCase().includes("order number:")) {
      insight_order_no = data_trim
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")[2];
    } else if (
      data_trim.toLowerCase().includes("lenovo") ||
      data_trim.toLowerCase().includes("apple")
    ) {
      insight_product_name = data_trim
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  });

  if (tracking_number !== "") {
    console.log(
      `parseInsight(${orderNum}) => Matching item in order to:`,
      insight_product_name
    );
    orders[index].items.forEach((item, ind) => {
      if (insightProductMappings[item.name]) {
        if (
          insight_product_name
            .toLowerCase()
            .includes(insightProductMappings[item.name])
        ) {
          if (item.tracking_number === "" || item.tracking_number === " ") {
            console.log(
              `parseInsight(${orderNum}) => Matched item, adding tracking number.`
            );
            item.tracking_number = [tracking_number];
            item.courier = courier;
            item.serial_number = serial_number;
            item.date_shipped = new Date().toLocaleDateString("en-US");
            item.supplier = "Insight";
            item.supplier_order_no = insight_order_no;
            item.shipping_status = "Shipped";
            device_name = item.name;
            let aftershipObj = {
              email:
                orders[index].client === "Alma"
                  ? [orders[index].email, "it-team@helloalma.com"]
                  : orders[index].client === "Roivant"
                  ? [orders[index].email, "ronald.estime@roivant.com"]
                  : [orders[index].email],
              title: orderNum,
              customer_name: orders[index].full_name,
              order_number: aftershipMappings[orders[index].items[ind].name]
                ? aftershipMappings[orders[index].items[ind].name]
                : orders[index].items[ind].name,
              tracking_number: tracking_number,
            };

            aftershipArray.push(aftershipObj);
          }
        }
      }
    });
  }

  if (device_name !== "") {
    console.log(`parseInsight(${orderNum}) => Adding to inventory.`);
    const new_device = {
      sn: serial_number,
      status: "Shipping",
      condition: "New",
      first_name: orders[index].firstName,
      last_name: orders[index].lastName,
      full_name: orders[index].full_name,
      supplier: "Insight",
      supplier_order_no: insight_order_no,
    };

    await autoAddNewSerialNumber(orders[index].client, device_name, new_device);
  }

  if (aftershipArray.length > 0) {
    console.log(`parseInsight(${orderNum}) => Creating Aftership tracking.`);
    await createAftershipTracking(aftershipArray);
    console.log(
      `parseInsight(${orderNum}) => Finished creating Aftership tracking.`
    );
    // const base64csv = createAftershipCSV(aftershipArray);
    // try {
    //   sendAftershipCSV(base64csv, orderNum);
    //   console.log(
    //     `parseInsight(${orderNum}) => Successfully finished sendAftershipCSV().`
    //   );
    // } catch (e) {
    //   console.log(
    //     `parseInsight(${orderNum}) => Error in sendAftershipCSV() function: ${e}`
    //   );
    // }
  }
  console.log(`parseInsight(${orderNum}) => Finished function.`);
}
