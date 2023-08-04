import { cdwMappings, aftershipMappings } from "./cdwConstants.js";
import { Configuration, OpenAIApi } from "openai";
import { addNewSerialNumber } from "../../routes/inventory.js";
import { inventoryMappings } from "./cdwConstants.js";
import { createAftershipCSV } from "../../services/aftership.js";
import { sendAftershipCSV } from "../../services/sendEmail.js";

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
  const openai = new OpenAIApi(configuration);
  console.log(`addCDWTrackingNumber(${orderNum}) => Starting function.`);
  const trackingPatterns = {
    UPS: /\b1Z[A-HJ-NP-Z0-9]{16}\b/g,
    FedEx: /\b(\d{12}|\d{15})\b/g,
  };

  const cdwOrderPattern = /Order #([^/]+)/;
  const cdwOrderMatch = subject.match(cdwOrderPattern);

  let tracking_number = "";
  let matches = [];
  let courier = "";
  let aftershipArray = [];
  let serial_number = "";
  let device_name = "";

  if (decodedMessage.match(trackingPatterns.FedEx)) {
    matches = decodedMessage.match(trackingPatterns.FedEx);
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Matched to FedEx: `,
      matches
    );
    if (matches.length > 0) {
      courier = "FedEx";
      tracking_number = matches[0];
    }
  } else if (decodedMessage.match(trackingPatterns.UPS)) {
    matches = decodedMessage.match(trackingPatterns.UPS);
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Matched to UPS: `,
      matches
    );
    if (matches.length > 0) {
      courier = "UPS";
      tracking_number = matches[0];
    }
  }

  try {
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Getting serial number from CDW email.`
    );
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages: [
        {
          role: "system",
          content:
            "You're a developer and given html, find the serial number: " +
            decodedMessage.replace(/<[^>]+>/g, "") +
            ". Only return the serial number as a string.",
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    serial_number = response.data.choices[0].message.content;
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Got serial number from CDW email:`,
      serial_number
    );
  } catch (e) {
    console.log(
      `addCDWTrackingNumber(${orderNum}) => Error in getting serial number from CDW email. Error:`,
      e
    );
  }

  if (tracking_number !== "") {
    orders[index].items.forEach((item, ind) => {
      if (cdwMappings[item.name] && matches.length > 0) {
        if (decodedMessage.indexOf(cdwMappings[item.name]) > -1) {
          item.tracking_number = [tracking_number];
          item.courier = courier;
          item.serial_number = serial_number;
          item.date_shipped = new Date().toLocaleDateString("en-US");
          device_name = item.name;
          let aftershipObj = {
            email:
              orders[index].client === "Alma"
                ? '"' + orders[index].email + ',it-team@helloalma.com"'
                : orders[index].email,
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
        }
      } else {
        console.log(
          `addCDWTrackingNumber(${orderNum}) => Missing mapping for laptop: ${item.name}`
        );
      }
    });
  }

  if (device_name !== "") {
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
      `addCDWTrackingNumber(${orderNum}) => Sending Aftership CSV file.`
    );
    const base64csv = createAftershipCSV(aftershipArray);
    try {
      sendAftershipCSV(base64csv, orderNum);
      console.log(
        `addCDWTrackingNumber(${orderNum}) => Successfully finished sendAftershipCSV().`
      );
    } catch (e) {
      console.log(
        `addCDWTrackingNumber(${orderNum}) => Error in sendAftershipCSV() function: ${e}`
      );
    }
  }

  console.log(`addCDWTrackingNumber(${orderNum}) => Finished function.`);
}
