import cheerio from "cheerio";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import { fullyMappingToWix } from "../constants.js";
import { trackingRegex } from "../constants.js";
import { createAftershipCSV } from "../../services/aftership.js";
import { areAllShipped } from "../utility.js";

function addFullyTrackingNumber(decodedMessage, orders, supplier, index) {
  const orderNum = orders[index].orderNo;
  console.log(`addFullyTrackingNumber(${orderNum}) => Starting function.`);
  const $ = cheerio.load(decodedMessage);
  let trackNum = "";
  let itemMapping = {};
  let aftershipArray = [];

  $("a").each((i, link) => {
    const href = link.attribs.href;
    if (href?.indexOf("apps/fedextrack") > -1) {
      trackNum = trackingRegex[supplier].exec(href)[1].split("&");
    }
  });
  console.log(
    `addFullyTrackingNumber(${orderNum}) => Got tracking number(s): ${trackNum}`
  );
  $("td").each((i, row) => {
    const colSpan = row.attribs.colspan;
    let counterIndex = 0;

    if (colSpan === "18") {
      const itemText = $(row).text();
      itemMapping[itemText] = trackNum[counterIndex];
      const wixItemName = fullyMappingToWix[itemText];
      console.log(
        `addFullyTrackingNumber(${orderNum}) => Got item name: ${itemText} and mapped to wix item name: ${wixItemName}`
      );
      const itemIndex = orders[index]?.items?.findIndex(
        (item) => item.name === wixItemName
      );
      const curTrackingNumber = trackNum[counterIndex];
      let aftershipObj = {
        email: orders[index].email,
        title: orders[index].orderNo,
        customer_name: orders[index].full_name,
        order_number: orders[index].items[itemIndex].name,
      };
      console.log(
        `addFullyTrackingNumber(${orderNum}) => Adding tracking number: ${trackNum[counterIndex]} to item: ${orders[index].items[itemIndex].name}`
      );
      if (orders[index]?.items[itemIndex]?.tracking_number === "") {
        orders[index].items[itemIndex].tracking_number = [curTrackingNumber];
        aftershipObj.tracking_number = curTrackingNumber;
        aftershipArray.push(aftershipObj);
      } else if (
        orders[index]?.items[itemIndex]?.tracking_number?.length > 0 &&
        orders[index]?.items[itemIndex]?.tracking_number?.indexOf(
          curTrackingNumber
        ) < 0
      ) {
        orders[index].items[itemIndex].tracking_number.push(curTrackingNumber);
        aftershipObj.tracking_number = curTrackingNumber;
        aftershipArray.push(aftershipObj);
      }
      counterIndex++;
    }
  });

  if (aftershipArray.length > 0) {
    const base64csv = createAftershipCSV(aftershipArray);
    try {
      sendAftershipCSV(base64csv, orderNum);
      console.log(
        `addFullyTrackingNumber(${orderNum}) => Successfully finished sendAftershipCSV().`
      );
    } catch (e) {
      console.log(
        `addFullyTrackingNumber(${orderNum}) => Error in sendAftershipCSV() function: ${e}`
      );
    }
  }
  areAllShipped(orders[index]);
  console.log(`addFullyTrackingNumber(${orderNum}) => Ending function.`);
}

export { addFullyTrackingNumber };
