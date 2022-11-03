import { google } from "googleapis";
import path from "path";
import { trackingEmails } from "../utils/constants.js";
import { getTrackingNumber } from "../utils/emailParser.js";

async function getEmailId(historyid) {
  const JWT = google.auth.JWT;
  const authClient = new JWT({
    keyFile: path.resolve(path.resolve(), "keys.json"),
    scopes: ["https://mail.google.com/"],
    subject: "andy@withspoke.com",
  });

  await authClient.authorize();

  const gmail = google.gmail({
    auth: authClient,
    version: "v1",
  });

  const res = await gmail.users.history.list({
    userId: "andy@withspoke.com",
    startHistoryId: historyid,
  });
  console.log("result  ::::::: ", res.data);
  if (res.data.history && res.data.history.length > 0) {
    const messageId = res.data.history[0].messages[0].id;
    console.log("res data history message id :::::: ", messageId);
  }
}

async function getEmailBody(messageId) {
  const JWT = google.auth.JWT;
  const authClient = new JWT({
    keyFile: path.resolve(path.resolve(), "keys.json"),
    scopes: ["https://mail.google.com/"],
    subject: "andy@withspoke.com",
  });

  await authClient.authorize();

  const gmail = google.gmail({
    auth: authClient,
    version: "v1",
  });

  const res = await gmail.users.messages.get({
    userId: "andy@withspoke.com",
    id: messageId,
  });
  //res.data.payload.headers
  let isTrackingEmail = checkFromEmail(res?.data?.payload?.headers);

  // part 0 is the text, part 1 is the html
  if (isTrackingEmail) {
    let body = res?.data?.payload?.parts[1].body;
    const trackingNumber = getTrackingNumber(body);
  }
  console.log("message res ::::::::: ", res);
}

function checkFromEmail(headers) {
  let isTrackingEmail = false;
  const fromHeader = headers.filter((header) => header.name === "From");

  if (fromHeader && fromHeader.length > 0) {
    trackingEmails.every((email) => {
      if (fromHeader[0].value.includes(email)) {
        isTrackingEmail = true;
        return false;
      }
    });
  }

  return isTrackingEmail;
}

export { getEmailId, getEmailBody };
