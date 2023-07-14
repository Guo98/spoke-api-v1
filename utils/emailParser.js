// import mockData from "./mock.json" assert { type: "json" };
import { trackingRegex } from "../utils/constants.js";
import { addBHTrackingNumber } from "./parsers/bh.js";
import { addFullyTrackingNumber } from "./parsers/fully.js";
import { addCTSTrackingNumber } from "./parsers/cts.js";
import addCDWTrackingNumber from "./parsers/cdw.js";
import cheerio from "cheerio";

/**
 *
 * @param {base64 string} emailBody
 * @param {string} supplier
 * @param {Array[Object]} orders
 * @param {string} subject
 */
async function getTrackingNumber(emailBody, supplier, orders, subject) {
  console.log(`getTrackingNumber(${supplier}) => Starting function.`);
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
        `getTrackingNumber(${supplier}) => CTS email received for order number(s): ${orderNum}`
      );
    } else if (
      supplier === "bh" &&
      decodedMessage.indexOf("Critical Technology Services") > -1
    ) {
      console.log(`getTrackingNumber(${supplier}) => B&H order going to CTS.`);
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
        console.log(
          `getTrackingNumber(${supplier}) => Matched shipment to order: ${orders[i].orderNo}`
        );
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
        console.log(
          `getTrackingNumber(${supplier}) => Matched shipment to order(s): ${JSON.stringify(
            orderIndexList
          )}`
        );
      }
    }
  }

  let updateResult = [];
  if (orderIndex > -1 || orderIndexList.length !== 0) {
    if (supplier === "CTS") {
      console.log(
        `getTrackingNumber(${supplier}) => Adding CTS tracking number.`
      );
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
      console.log(
        `getTrackingNumber(${supplier}) => Adding B&H tracking number.`
      );
      addBHTrackingNumber(decodedMessage, orders, supplier, orderIndex);
      updateResult.push({
        orderIndex: orderIndex,
        items: orders[orderIndex]?.items,
      });
    } else if (supplier === "CDW") {
      console.log(
        `getTrackingNumber(${supplier}) => Adding CDW tracking number.`
      );
      await addCDWTrackingNumber(decodedMessage, orders, orderIndex, subject);
      updateResult.push({
        orderIndex: orderIndex,
        items: orders[orderIndex]?.items,
      });
    }
  }

  console.log(`getTrackingNumber(supplier: ${supplier}) => Ending function.`);
  return updateResult;
}

export { getTrackingNumber };
