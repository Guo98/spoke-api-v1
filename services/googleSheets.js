import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import "dotenv/config";

async function addRow() {
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets"
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient
  });

  const readData = await sheets.spreadsheets.values.append({
    spreadsheetId: "1YdyC4l2u3iT5GwuP6DfvsDgsTOd2Rs6xZKKGFroqyiI",
    range: "Sheet1!A:B",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [["test2_val", "test3_val"]]
    }
  });

  return readData;
}

async function readRow() {
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets"
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient
  });

  const readData = await sheets.spreadsheets.values.get({
    spreadsheetId: "1YdyC4l2u3iT5GwuP6DfvsDgsTOd2Rs6xZKKGFroqyiI",
    range: "Sheet1!A:B"
  });

  return readData;
}

export { addRow, readRow };
