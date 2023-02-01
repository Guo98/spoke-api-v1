import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import "dotenv/config";

async function addOffboardRow(req) {
  const {
    order_no,
    client,
    recipient_name,
    recipient_email,
    item,
    shipping_address,
    phone_num,
    requestor_email,
    note,
  } = req;
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient,
  });

  const readData = await sheets.spreadsheets.values.append({
    spreadsheetId: "1YdyC4l2u3iT5GwuP6DfvsDgsTOd2Rs6xZKKGFroqyiI",
    range: "Sheet1!A:N",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [
          order_no,
          "",
          new Date(),
          client,
          "Open",
          recipient_name,
          recipient_email,
          item,
          "",
          "",
          "Offboarding",
          "Ground",
          shipping_address,
          phone_num,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          requestor_email,
          note,
        ],
      ],
    },
  });

  return readData;
}

async function addRedeployRow(req) {
  const {
    client,
    recipient_name,
    recipient_email,
    item,
    shipping_address,
    phone_num,
    notes,
    order_no,
  } = req;
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient,
  });

  const readData = await sheets.spreadsheets.values.append({
    spreadsheetId: "1YdyC4l2u3iT5GwuP6DfvsDgsTOd2Rs6xZKKGFroqyiI",
    range: "Sheet2!A:G",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [
          order_no,
          recipient_name,
          recipient_email,
          phone_num,
          shipping_address,
          notes,
          client,
          item,
        ],
      ],
    },
  });

  return readData;
}

async function readRow() {
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient,
  });

  const readData = await sheets.spreadsheets.values.get({
    spreadsheetId: "1YdyC4l2u3iT5GwuP6DfvsDgsTOd2Rs6xZKKGFroqyiI",
    range: "Sheet1!A:B",
  });

  return readData;
}

/**
 *
 * @param {Array} values
 * @param {string} spreadsheetId
 * @param {number} sheetId
 * @param {number} endColumnIndex
 * @returns {void}
 */
async function addOrderRow(values, spreadsheetId, sheetId, endColumnIndex) {
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient,
  });
  // const todayDate = new Date();
  // todayDate.toLocaleString("en-US", { timeZone: "America/New_York" });
  const insertData = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    resource: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: 1,
              endIndex: 2,
            },
            inheritFromBefore: false,
          },
        },
        {
          updateCells: {
            rows: {
              values: values,
            },
            fields: "*",
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: endColumnIndex,
            },
          },
        },
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: endColumnIndex,
            },
            top: {
              style: "SOLID",
            },
            bottom: {
              style: "SOLID",
            },
            left: {
              style: "SOLID",
            },
            right: {
              style: "SOLID",
            },
            innerVertical: {
              style: "SOLID",
            },
          },
        },
      ],
    },
  });
  return insertData;
}

export { addOffboardRow, readRow, addRedeployRow, addOrderRow };
