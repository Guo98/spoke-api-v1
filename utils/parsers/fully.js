import cheerio from "cheerio";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import { fullyMappingToWix } from "../constants.js";
import { trackingRegex } from "../constants.js";
import { createAftershipCSV } from "../../services/aftership.js";

function addFullyTrackingNumber(decodedMessage, orders, supplier, index) {
  console.log("addFullyTrackingNumber() => Starting function");
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

  $("td").each((i, row) => {
    const colSpan = row.attribs.colspan;
    let counterIndex = 0;

    if (colSpan === "18") {
      const itemText = $(row).text();
      itemMapping[itemText] = trackNum[counterIndex];
      const wixItemName = fullyMappingToWix[itemText];
      const orderIndex = orders[index]?.items?.findIndex(
        (item) => item.name === wixItemName
      );
      const curTrackingNumber = trackNum[counterIndex];
      let aftershipObj = {
        email: orders[index].email,
        title: orders[index].orderNo,
        customer_name: orders[index].full_name,
        order_number: item.name,
      };

      if (orders[index]?.items[orderIndex]?.tracking_number === "") {
        orders[index].items[orderIndex].tracking_number = [curTrackingNumber];
        aftershipObj.tracking_number = curTrackingNumber;
        aftershipArray.push(aftershipObj);
      } else if (
        orders[index]?.items[orderIndex]?.tracking_number?.length > 0 &&
        orders[index]?.items[orderIndex]?.tracking_number?.indexOf(
          curTrackingNumber
        ) < 0
      ) {
        orders[index].items[orderIndex].tracking_number.push(curTrackingNumber);
        aftershipObj.tracking_number = curTrackingNumber;
        aftershipArray.push(aftershipObj);
      }
      counterIndex++;
    }
  });
  const base64csv = createAftershipCSV(aftershipArray);

  sendAftershipCSV(base64csv);
  // areAllShipped(orders[index]);
}

export { addFullyTrackingNumber };
