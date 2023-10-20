import { google } from "googleapis";
import path from "path";
import { trackingEmails } from "../utils/constants.js";
import { getTrackingNumber } from "../utils/emailParser.js";
import { completeCTSReturn } from "../utils/parsers/ctsreturn.js";

async function getEmailId(historyid, orders, prevMessageId) {
  console.log(`getEmailId(${historyid}) => Starting function.`);
  const JWT = google.auth.JWT;
  const authClient = new JWT({
    keyFile: path.resolve(path.resolve(), "keys.json"),
    scopes: ["https://mail.google.com/"],
    subject: "info@withspoke.com",
  });

  await authClient.authorize();

  const gmail = google.gmail({
    auth: authClient,
    version: "v1",
  });

  const res = await gmail.users.history.list({
    userId: "info@withspoke.com",
    labelId: "Label_4974424275359511511",
    startHistoryId: historyid,
  });
  console.log(
    `getEmailId(${historyid}) =>  gmail users history list results: ${JSON.stringify(
      res.data
    )}`
  );
  if (res.data.history && res.data.history.length > 0) {
    const messageId = res.data.history[0].messages[0].id;
    console.log(
      `getEmailId(${historyid}) => Has message id, checking email body with: ${messageId}`
    );
    if (messageId !== prevMessageId) {
      await getEmailBody(messageId, orders);
      return messageId;
    }
  }

  return "";
}

async function getEmailBody(messageId, orders) {
  console.log(`getEmailBody(${messageId}) => Starting function.`);
  const JWT = google.auth.JWT;
  const authClient = new JWT({
    keyFile: path.resolve(path.resolve(), "keys.json"),
    scopes: ["https://mail.google.com/"],
    subject: "info@withspoke.com",
  });

  await authClient.authorize();

  const gmail = google.gmail({
    auth: authClient,
    version: "v1",
  });

  const res = await gmail.users.messages.get({
    userId: "info@withspoke.com",
    id: messageId,
  });
  //res.data.payload.headers
  console.log(
    `getEmailBody(${messageId}) => Received result from gmail users message function.`
  );
  let isTrackingEmail = checkFromEmail(res?.data?.payload?.headers);
  console.log(
    `getEmailBody(${messageId}) => Checked if this email was a tracking email: ${isTrackingEmail}`
  );

  if (isTrackingEmail) {
    console.log(
      `getEmailBody(${messageId}) => Tracking email from: ${isTrackingEmail.id}.`
    );
    const receivedOrders = await orders.getAllReceived();
    let body;
    let subject = "";
    switch (isTrackingEmail.id) {
      case "Fully":
        body = res?.data?.payload?.body?.data;
        subject = res.data.payload.headers.filter(
          (header) => header.name === "Subject"
        )[0].value;
        break;
      case "logitech":
        body = res?.data?.payload?.parts[0]?.body?.data;
        break;
      case "bh":
        body = res?.data?.payload?.parts[0]?.parts[1]?.body?.data;
        subject = res.data.payload.headers.filter(
          (header) => header.name === "Subject"
        )[0].value;
        break;
      case "dell":
        body = res?.data?.payload?.parts[0]?.parts[0]?.body?.data;
        break;
      case "CTS":
        body = res?.data?.payload?.body?.data;
        subject = res.data.payload.headers.filter(
          (header) => header.name === "Subject"
        )[0].value;
        break;
      case "CDW":
        subject = res.data.payload.headers.filter(
          (header) => header.name === "Subject"
        )[0].value;
        body = res?.data?.payload?.parts[1]?.body?.data;
        break;
      case "insight":
        subject = res.data.payload.headers.filter(
          (header) => header.name === "Subject"
        )[0].value;
        body = res?.data?.payload?.parts[0]?.parts[0]?.body?.data;
        break;
      default:
        // body = res?.data?.payload?.parts[1].body;
        break;
    }

    if (
      (isTrackingEmail.id === "Fully" && subject.indexOf("has shipped") > -1) ||
      (isTrackingEmail.id === "CTS" && subject.indexOf("Has Shipped") > -1) ||
      (isTrackingEmail.id === "bh" && subject.indexOf("Shipped") > -1) ||
      (isTrackingEmail.id === "CDW" &&
        subject.includes("CDW Shipping Confirmation")) ||
      (isTrackingEmail.id === "insight" &&
        subject.toLowerCase().includes("has shipped"))
    ) {
      console.log(
        `getEmailBody(${messageId}) => Starting getTrackingNumber(supplier: ${isTrackingEmail.id}) function.`
      );
      const trackingResult = await getTrackingNumber(
        body,
        isTrackingEmail.id,
        receivedOrders,
        subject
      );

      for (let i = 0; i < trackingResult.length; i++) {
        const orderIndex = trackingResult[i].orderIndex;
        const updatedItems = trackingResult[i].items;
        if (receivedOrders[orderIndex]?.id) {
          const receivedId = receivedOrders[orderIndex].id;
          if (receivedOrders[orderIndex]?.shipping_status === "Incomplete") {
            console.log(
              `getEmailBody(${messageId}) => Should update this document in the database: ${receivedOrders[orderIndex]?.id}`
            );
            try {
              await orders.updateOrder(
                receivedId,
                receivedOrders[orderIndex]?.full_name,
                updatedItems
              );
              console.log(
                `getEmailBody(${messageId}) => Successfully updated ${receivedId} in Received container.`
              );
            } catch (e) {
              console.log(
                `getEmailBody(${messageId}) => Error in updating ${receivedId} in Received container. Error: ${e}`
              );
            }
          } else {
            const orderClient = receivedOrders[orderIndex]?.client;
            console.log(
              `getEmailBody(${messageId}) => Should move order from Received container to ${orderClient}.`
            );

            let updateOrderObj = receivedOrders[orderIndex];
            updateOrderObj.items = updatedItems;
            try {
              await orders.removeFromReceived(
                receivedId,
                receivedOrders[orderIndex]?.full_name
              );
              console.log(
                `getEmailBody(${messageId}) => Successfully removed ${receivedId} from Received container.`
              );
            } catch (e) {
              console.log(
                `getEmailBody(${messageId}) => Error in removing ${receivedId}. Error: ${e}`
              );
            }
            if (orderClient) {
              try {
                await orders.completeOrder(orderClient, updateOrderObj);
                console.log(
                  `getEmailBody(${messageId}) => Successfully finished moving ${receivedId} to ${orderClient}`
                );
              } catch (e) {
                console.log(
                  `getEmailBody(${messageId}) => Error in adding order to client: ${orderClient}. Error: $(e)`
                );
              }
            }
          }
        }
      }
    } else if (
      isTrackingEmail.id === "CTS" &&
      subject.includes("Device Return Complete")
    ) {
      console.log(`getEmailBody(${messageId}) => Received a CTS return email.`);
      await completeCTSReturn(body, orders);
    }
  }
  console.log(`getEmailBody(${messageId}) => Ending function.`);
}

function checkFromEmail(headers) {
  console.log("checkFromEmail() => Starting function.");
  let isTrackingEmail = false;
  const fromHeader = headers.filter((header) => header.name === "From");
  if (fromHeader && fromHeader.length > 0) {
    console.log(
      "checkFromEmail() => Filtered out From headers from email:",
      fromHeader[0].value
    );
    trackingEmails.forEach((email) => {
      if (fromHeader[0].value.includes(email.email)) {
        isTrackingEmail = email;
      }
    });
  }

  return isTrackingEmail;
}

export { getEmailId, getEmailBody };
