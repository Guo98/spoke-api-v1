import { cdwMappings, aftershipMappings } from "./cdwConstants.js";
import { Configuration, OpenAIApi } from "openai";
import { load } from "cheerio";
import { addNewSerialNumber } from "../../routes/inventory.js";
import { inventoryMappings } from "./cdwConstants.js";
import {
  createAftershipCSV,
  createAftershipTracking,
} from "../../services/aftership.js";
import { sendAftershipCSV } from "../../services/sendEmail.js";
import determineTrackingNumber from "./common/tracking.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

export default async function addCDWTrackingNumber(
  decodedMessage,
  orders,
  index,
  subject
) {
  const orderNum = orders[index].orderNo;

  if (orders[index].client === "Alma") return;

  // const openai = new OpenAIApi(configuration);
  console.log(`addCDWTrackingNumber(${orderNum}) => Starting function.`);

  const cdwOrderPattern = /Order #([^/]+)/;
  const cdwOrderMatch = subject.match(cdwOrderPattern);

  let tracking_number = "";
  let courier = "";
  let aftershipArray = [];
  let serial_number = "";
  let device_name = "";
  let already_updated = false;

  const tn_result = determineTrackingNumber(decodedMessage, orderNum);

  if (tn_result) {
    courier = tn_result.courier;
    tracking_number = tn_result.tracking_number;
  }

  const $ = load(decodedMessage);

  // try {
  //   console.log(
  //     `addCDWTrackingNumber(${orderNum}) => Getting serial number from CDW email.`
  //   );
  //   const response = await openai.createChatCompletion({
  //     model: "gpt-3.5-turbo-0613",
  //     messages: [
  //       {
  //         role: "system",
  //         content:
  //           "You're a developer and given html, find the serial number: " +
  //           decodedMessage.replace(/<[^>]+>/g, "") +
  //           ". Only return the serial number as a string.",
  //       },
  //     ],
  //     temperature: 0.5,
  //     max_tokens: 300,
  //   });

  //   serial_number = response.data.choices[0].message.content;
  //   console.log(
  //     `addCDWTrackingNumber(${orderNum}) => Got serial number from CDW email:`,
  //     serial_number
  //   );
  // } catch (e) {
  //   console.log(
  //     `addCDWTrackingNumber(${orderNum}) => Error in getting serial number from CDW email. Error:`,
  //     e
  //   );
  // }

  $("td").each((index, element) => {
    const data_trim = $(element).text().trim().toLowerCase();

    if (
      data_trim.includes("serial numbers for order") &&
      !data_trim.includes("shipping confirmation")
    ) {
      const result = data_trim
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ");

      serial_number = result[result.length - 1].toUpperCase();
    }
  });

  if (tracking_number !== "") {
    orders[index].items.forEach((item, ind) => {
      if (cdwMappings[item.name]) {
        if (decodedMessage.indexOf(cdwMappings[item.name]) > -1) {
          if (item.tracking_number === "") {
            item.tracking_number = [tracking_number];
            item.courier = courier;
            item.serial_number = serial_number;
            item.date_shipped = new Date().toLocaleDateString("en-US");
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
            console.log(
              `addCDWTrackingNumber(${orderNum}) => Updated item:`,
              item
            );
          } else {
            already_updated = true;
          }
        }
      } else {
        console.log(
          `addCDWTrackingNumber(${orderNum}) => Missing mapping for laptop: ${item.name}`
        );
      }
    });
  }

  if (device_name !== "" && !already_updated) {
    const new_device = {
      sn: serial_number,
      status: "Shipping",
      condition: "New",
      first_name: orders[index].firstName,
      last_name: orders[index].lastName,
      full_name: orders[index].full_name,
      supplier: "CDW",
      supplier_order_no: cdwOrderMatch ? cdwOrderMatch[1] : "",
    };

    if (Object.keys(inventoryMappings).indexOf(device_name) > -1) {
      await addNewSerialNumber(
        orders[index].client,
        inventoryMappings[device_name],
        new_device
      );
    }
  }
  orders[index].shipping_status = "Shipped";
  if (aftershipArray.length > 0) {
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Creating Aftership tracking.`
    );
    await createAftershipTracking(aftershipArray);
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Finished creating Aftership tracking.`
    );
    // const base64csv = createAftershipCSV(aftershipArray);
    // try {
    //   sendAftershipCSV(base64csv, orderNum);
    //   console.log(
    //     `addCDWTrackingNumber(${orderNum}) => Successfully finished sendAftershipCSV().`
    //   );
    // } catch (e) {
    //   console.log(
    //     `addCDWTrackingNumber(${orderNum}) => Error in sendAftershipCSV() function: ${e}`
    //   );
    // }
  }

  console.log(`addCDWTrackingNumber(${orderNum}) => Finished function.`);
}
