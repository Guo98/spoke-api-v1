// import mockData from "./mock.json" assert { type: "json" };
import {
  trackingRegex,
  fullyMapping,
  fullyMappingToWix,
} from "../utils/constants.js";
import { addBHTrackingNumber } from "./parsers/bh.js";
import { addFullyTrackingNumber } from "./parsers/fully.js";
import { addCTSTrackingNumber } from "./parsers/cts.js";
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
  let orderIndexList = [];
  if (orders?.length > 0) {
    let orderNum = [];
    if (supplier === "CTS") {
      if (subject.indexOf("entries") > -1) {
        $("p").each((i, ptag) => {
          const text = $(ptag).text();
          if (text.indexOf("Order") > -1) {
            const ctsOrders = text.split("-");
            ctsOrders.forEach((ctsOrder) => {
              orderNum.push(
                parseInt(
                  trackingRegex.CTSOrder.exec(ctsOrder)[0].replace("Order ", "")
                )
              );
            });
          }
        });
      } else {
        orderNum.push(parseInt(subject.replace(/\D/g, "")));
      }

      console.log(
        `getTrackingNumber() => CTS email received for order number: ${orderNum}`
      );
    } else if (
      supplier === "bh" &&
      decodedMessage.indexOf("Critical Technology Services") > -1
    ) {
      console.log(`getTrackingNumber() => B&H order going to CTS.`);
      return [];
    }
    for (let i = 0; i < orders.length; i++) {
      if (
        supplier !== "CTS" &&
        decodedMessage
          .toLowerCase()
          .indexOf(orders[i].firstName.toLowerCase()) > -1 &&
        decodedMessage.indexOf(orders[i].address?.city) > -1
      ) {
        orderIndex = i;
        break;
      } else if (
        supplier === "CTS" &&
        orderNum.indexOf(orders[i].orderNo) > -1 &&
        orderNum.length !== orderIndexList.length
      ) {
        const numberIndex = orderNum.indexOf(orders[i].orderNo);
        orderIndexList.push({
          orderNo: orderNum[numberIndex],
          orderIndex: i,
          splitIndex: numberIndex,
        });
      }
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
  let updateResult = [];
  if (orderIndex > -1 || orderIndexList.length !== 0) {
    if (supplier === "Fully") {
      addFullyTrackingNumber(decodedMessage, orders, supplier, orderIndex);
      updateResult.push({
        orderIndex: orderIndex,
        items: orders[orderIndex]?.items,
      });
    } else if (supplier === "CTS") {
      orderIndexList.forEach((obj) => {
        addCTSTrackingNumber(
          decodedMessage,
          orders,
          supplier,
          obj.orderIndex,
          obj.splitIndex
        );
        updateResult.push({
          orderIndex: obj.orderIndex,
          items: orders[obj.orderIndex]?.items,
        });
      });
    } else if (supplier === "bh") {
      addBHTrackingNumber(decodedMessage, orders, supplier, orderIndex);
      updateResult.push({
        orderIndex: orderIndex,
        items: orders[orderIndex]?.items,
      });
    }
  }
  // console.log("checking :::::: ", orders[orderIndex]?.items);
  console.log(`getTrackingNumber(supplier: ${supplier}) => Ending function.`);
  return updateResult;
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
