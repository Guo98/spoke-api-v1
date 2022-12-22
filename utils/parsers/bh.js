import cheerio from "cheerio";
import { bhMappings } from "./bhConstants.js";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import { createAftershipCSV } from "../../services/aftership.js";
import { areAllShipped } from "../utility.js";

function addBHTrackingNumber(decodedMessage, orders, supplier, index) {
  const orderNum = orders[index].orderNo;
  console.log(`addBHTrackingNumber(${orderNum}) => Starting function.`);
  const $ = cheerio.load(decodedMessage);
  let trackNum = "";
  let aftershipArray = [];
  $("a").each((i, link) => {
    const href = link.attribs.href;

    if (href?.indexOf("Package_Detail") > -1) {
      trackNum = $(link).text().trim();
      console.log(
        `addBHTrackingNumber(${orderNum}) => Got tracking number: ${trackNum}`
      );
    } else if (href?.indexOf("Product_Detail") > -1) {
      const productDesc = $(link).text().trim();
      console.log(
        `addBHTrackingNumber(${orderNum}) => Got product description: ${productDesc}`
      );
      if (productDesc !== "") {
        let productKeyword = bhMappings[productDesc];
        const itemIndex = orders[index].items.findIndex(
          (item) => item.name.toLowerCase().indexOf(productKeyword) > -1
        );
        orders[index].items[itemIndex].tracking_number = [trackNum];
        let aftershipObj = {
          email: orders[index].email,
          title: orderNum,
          customer_name: orders[index].full_name,
          order_number: orders[index].items[itemIndex].name,
          tracking_number: trackNum,
        };
        aftershipArray.push(aftershipObj);
        console.log(
          `addBHTrackingNumber(${orderNum}) => Adding tracking number: ${trackNum} to item: ${orders[index].items[itemIndex]}`
        );
      }
    }
  });
  if (aftershipArray.length > 0) {
    console.log(
      `addBHTrackingNumber(${orderNum}) => Sending Aftership CSV file.`
    );
    const base64csv = createAftershipCSV(aftershipArray);
    try {
      sendAftershipCSV(base64csv, orderNum);
      console.log(
        `addBHTrackingNumber(${orderNum}) => Successfully finished sendAftershipCSV().`
      );
    } catch (e) {
      console.log(
        `addBHTrackingNumber(${orderNum}) => Error in sendAftershipCSV() function: ${e}`
      );
    }
  }
  areAllShipped(orders[index]);
  console.log(`addBHTrackingNumber(${orderNum}) => Ending function.`);
}

export { addBHTrackingNumber };
