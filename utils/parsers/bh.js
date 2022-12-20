import cheerio from "cheerio";
import { bhMappings } from "./bhConstants.js";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import { createAftershipCSV } from "../../services/aftership.js";
import { areAllShipped } from "../utility.js";

function addBHTrackingNumber(decodedMessage, orders, supplier, index) {
  console.log("addBHTrackingNumber() => Starting function.");
  const $ = cheerio.load(decodedMessage);
  let trackNum = "";
  let aftershipArray = [];
  $("a").each((i, link) => {
    const href = link.attribs.href;
    // console.log("href ::::::: ", href);
    if (href?.indexOf("Package_Detail") > -1) {
      trackNum = $(link).text().trim();
    } else if (href?.indexOf("Product_Detail") > -1) {
      const productDesc = $(link).text().trim();
      if (productDesc !== "") {
        let productKeyword = bhMappings[productDesc];
        const itemIndex = orders[index].items.findIndex(
          (item) => item.name.toLowerCase().indexOf(productKeyword) > -1
        );
        orders[index].items[itemIndex].tracking_number = [trackNum];
        let aftershipObj = {
          email: orders[index].email,
          title: orders[index].orderNo,
          customer_name: orders[index].full_name,
          order_number: orders[index].items[itemIndex].name,
          tracking_number: trackNum,
        };
        aftershipArray.push(aftershipObj);
      }
    }
  });
  if (aftershipArray.length > 0) {
    console.log("addBHTrackingNumber() => Sending Aftership CSV file.");
    const base64csv = createAftershipCSV(aftershipArray);
    try {
      sendAftershipCSV(base64csv);
      console.log(
        `addBHTrackingNumber() => Successfully finished sendAftershipCSV().`
      );
    } catch (e) {
      console.log(
        `addBHTrackingNumber() => Error in sendAftershipCSV() function: ${e}`
      );
    }
  }
  areAllShipped(orders[index]);
  console.log("addBHTrackingNumber() => Ending function.");
}

export { addBHTrackingNumber };
