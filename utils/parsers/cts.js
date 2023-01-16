import cheerio from "cheerio";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import { createAftershipCSV } from "../../services/aftership.js";
import { trackingRegex } from "../constants.js";
import { areAllShipped } from "../utility.js";

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
      const splitLine = orderLines[lineIndex];
      const trackNum = trackingRegex[supplier].exec(splitLine)[0];
      orders[index]?.items.forEach((item) => {
        if (
          (item.supplier === supplier || item.type === "laptop") &&
          item.tracking_number === ""
        ) {
          item.tracking_number = [trackNum];
          const aftershipObj = {
            tracking_number: trackNum,
            email: orders[index].email,
            title: orders[index].orderNo,
            customer_name: orders[index].full_name,
            order_number:
              item.name.indexOf('"') > -1 ? item.name.split('"')[0] : item.name,
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
  areAllShipped(orders[index]);
  console.log(`addCTSTrackingNumber(${orderNum}) => Ending function.`);
}

export { addCTSTrackingNumber };
