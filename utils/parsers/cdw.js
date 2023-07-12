import { cdwMappings } from "./cdwConstants.js";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

export default async function addCDWTrackingNumber(
  decodedMessage,
  orders,
  index
) {
  const orderNum = orders[index].orderNo;
  const openai = new OpenAIApi(configuration);
  console.log(`addCDWTrackingNumber(${orderNum}) => Starting function.`);
  const trackingPatterns = {
    UPS: /\b1Z[A-HJ-NP-Z0-9]{16}\b/g,
    FedEx: /\b(\d{12}|\d{15})\b/g,
  };

  let tracking_number = "";
  let matches = [];
  let courier = "";
  let aftershipArray = [];
  let serial_number = "";

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

          let aftershipObj = {
            email: orders[index].email,
            title: orderNum,
            customer_name: orders[index].full_name,
            order_number: orders[index].items[ind].name,
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
