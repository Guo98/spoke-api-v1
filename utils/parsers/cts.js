import cheerio from "cheerio";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import { createAftershipCSV } from "../../services/aftership.js";
import { trackingRegex } from "../constants.js";

function determineAftershipNumber(name) {
  if (name === "Returning") {
    return "Equipment Return Box";
  } else if (name.indexOf('"') > -1) {
    return item.name.split('"')[0];
  } else {
    return name;
  }
}

function addCTSTrackingNumber(
  decodedMessage,
  orders,
  supplier,
  index,
  lineIndex
) {
  const orderNum = orders[index].orderNo;
  console.log(`addCTSTrackingNumber(${orderNum}) => Starting function.`);
  const $ = cheerio.load(decodedMessage);
  let aftershipArray = [];

  $("p").each((i, ptag) => {
    const text = $(ptag).text();
    const orderLines = text.split("-");
    if (orderLines[lineIndex].indexOf("Tracking #") > -1) {
      let splitLine = orderLines[lineIndex];
      if (splitLine.indexOf(" ") > -1) {
        splitLine.replace(" ", "");
      }

      const trackNum = trackingRegex[supplier].exec(splitLine)[0];

      orders[index]?.items.forEach((item) => {
        if (
          (item.supplier === supplier ||
            item.type === "laptop" ||
            item.name.toLowerCase().indexOf("macbook") > -1) &&
          item.tracking_number === ""
        ) {
          item.tracking_number = [trackNum];
          item.courier = "Fedex";
          const aftershipObj = {
            tracking_number: trackNum,
            email:
              orders[index].client === "Alma"
                ? '"' + orders[index].email + ',it-team@helloalma.com"'
                : orders[index].email,
            title: orders[index].orderNo,
            customer_name: orders[index].full_name,
            order_number: determineAftershipNumber(item.name),
          };
          aftershipArray.push(aftershipObj);
          console.log(
            `addCTSTrackingNumber(${orderNum}) => Adding tracking number: ${trackNum} to item: ${item.name}`
          );
        }
      });
    }
  });

  if (aftershipArray.length > 0) {
    const base64csv = createAftershipCSV(aftershipArray);
    try {
      sendAftershipCSV(base64csv, orderNum);
      console.log(
        `addCTSTrackingNumber(${orderNum}) => Successfully finished sendAftershipCSV().`
      );
    } catch (e) {
      console.log(
        `addCTSTrackingNumber(${orderNum}) => Error in sendAftershipCSV() function: ${e}`
      );
    }
  }
  if (orders[index].shipping_status !== "Shipped") {
    orders[index].shipping_status = "Shipped";
  }
  console.log(`addCTSTrackingNumber(${orderNum}) => Ending function.`);
}

export { addCTSTrackingNumber };
