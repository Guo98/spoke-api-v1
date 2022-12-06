// import mockData from "./mock.json" assert { type: "json" };
import {
  trackingRegex,
  fullyMapping,
  fullyMappingToWix,
} from "../utils/constants.js";
import { createAftershipCSV } from "../services/aftership.js";
import { sendAftershipCSV } from "../services/sendEmail.js";
import cheerio from "cheerio";

/**
 *
 * @param {base64 string} emailBody
 * @param {string} supplier
 * @param {Array[Object]} orders
 * @param {string} subject
 */
function getTrackingNumber(emailBody, supplier, orders, subject) {
  console.log(`getTrackingNumber(supplier: ${supplier}) => Starting function.`);
  let trackNum = "";
  const decodedMessage = atob(emailBody.replace(/-/g, "+").replace(/_/g, "/"));
  const $ = cheerio.load(decodedMessage);
  let orderIndex = -1;

  if (orders?.length > 0) {
    let orderNum = 0;
    if (supplier === "CTS") {
      orderNum = parseInt(subject.replace(/\D/g, ""));
      console.log(
        `getTrackingNumber() =CTS email received for order number: ${orderNum}`
      );
    }
    for (let i = 0; i < orders.length; i++) {
      if (
        supplier !== "CTS" &&
        decodedMessage.indexOf(orders[i].firstName) > -1 &&
        decodedMessage.indexOf(orders[i].address?.city) > -1
      ) {
        orderIndex = i;
      } else if (supplier === "CTS" && orders[i].orderNo === orderNum) {
        orderIndex = i;
      }
      // console.log("checking db order no >>>>>>>>> ", orders[i].orderNo);
      // console.log("parsed out ");
    }
  }

  // if (supplier === "dell") {
  //   $("span").each((i, span) => {
  //     const spanId = span.attribs.id;
  //     if (spanId?.indexOf("CARRIER_TRACKING_NO_0_0_0") > -1) {
  //       trackNum = $(span).text();
  //     }
  //   });
  // }
  // if (supplier !== "dell") {
  //   $("a").each((i, link) => {
  //     const href = link.attribs.href;
  //     if (href?.indexOf("Package_Detail") > -1 && supplier === "bh") {
  //       if ($(link).text() !== "Track Package") {
  //         trackNum = $(link).text().trim();
  //       }
  //     } else if (
  //       supplier === "logitech" &&
  //       $(link).text().indexOf("TRACK YOUR ORDER") > -1
  //     ) {
  //       trackNum = trackingRegex[supplier].exec(href)[0].split("=")[1];
  //     }
  //   });
  // }

  if (supplier === "Fully") {
    addFullyTrackingNumber(decodedMessage, orders, supplier, orderIndex);
  } else if (supplier === "CTS") {
    addCTSTrackingNumber(decodedMessage, orders, supplier, orderIndex);
  }
  // console.log("checking :::::: ", orders[orderIndex]?.items);
  return [orderIndex, orders[orderIndex]?.items];
}

/* 
  Different parsing methods for different suppliers
*/

// CTS smartsheet email parser
function addCTSTrackingNumber(decodedMessage, orders, supplier, index) {
  console.log("addCTSTrackingNumber() => Starting function.");
  const $ = cheerio.load(decodedMessage);
  let aftershipArray = [];
  $("p").each((i, ptag) => {
    const text = $(ptag).text();

    if (text.indexOf("Tracking #") > -1) {
      const trackNum = trackingRegex[supplier].exec(text)[0];

      orders[index].items.forEach((item) => {
        if (item.supplier === supplier && item.tracking_number === "") {
          item.tracking_number = [trackNum];
          const aftershipObj = {
            tracking_number: trackNum,
            email: orders[index].email,
            title: orders[index].orderNo,
            customer_name: orders[index].full_name,
            order_number: item.name,
          };
          aftershipArray.push(aftershipObj);
        }
      });
    }
  });
  const base64csv = createAftershipCSV(aftershipArray);

  sendAftershipCSV(base64csv);
  // areAllShipped(orders[index]);
}

// Fully parser, handles the multiple parts of desks
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

function areAllShipped(order) {
  let untrackedItem = false;
  order?.items.forEach((item) => {
    if (item.tracking_number === "") {
      untrackedItem = true;
    }
  });

  if (!untrackedItem) {
    order.shipping_status = "Complete";
  }
}

export { getTrackingNumber };
