import { google } from "googleapis";
import path from "path";
import { trackingEmails } from "../utils/constants.js";
import { getTrackingNumber } from "../utils/emailParser.js";

async function getEmailId(historyid) {
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
    startHistoryId: historyid,
  });
  console.log("result  ::::::: ", res.data);
  if (res.data.history && res.data.history.length > 0) {
    const messageId = res.data.history[0].messages[0].id;
    console.log("res data history message id :::::: ", messageId);
  }
}

async function getEmailBody(messageId, orders) {
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
  let isTrackingEmail = checkFromEmail(res?.data?.payload?.headers);

  if (isTrackingEmail) {
    // console.log("boyd tracking ::::: ", res?.data?.payload.parts[0].parts[1]);
    let body;
    let subject = "";
    switch (isTrackingEmail.id) {
      case "Fully":
        body = res?.data?.payload?.body?.data;
        break;
      case "logitech":
        body = res?.data?.payload.parts[0]?.body?.data;
        break;
      case "bh":
        body = res?.data?.payload.parts[0]?.parts[1]?.body?.data;
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
      default:
        body = res?.data?.payload?.parts[1].body;
        break;
    }
    const trackingResult = getTrackingNumber(
      body,
      isTrackingEmail.id,
      orders,
      subject
    );

    console.log(" order id checking >>>>>>>>>> ", orders[trackingResult[0]].id);

    return [orders[trackingResult[0]].id, trackingResult[1]];
  }
  // console.log("message res ::::::::: ", res);
}

function checkFromEmail(headers) {
  let isTrackingEmail = false;
  const fromHeader = headers.filter((header) => header.name === "From");
  if (fromHeader && fromHeader.length > 0) {
    trackingEmails.forEach((email) => {
      if (fromHeader[0].value.includes(email.email)) {
        isTrackingEmail = email;
      }
    });
  }

  return isTrackingEmail;
}

export { getEmailId, getEmailBody };
