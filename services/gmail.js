import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
import path from "path";

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
  }
}

export { getEmailId };
