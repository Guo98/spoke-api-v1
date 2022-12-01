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

async function addOrderRow(
  orderNo,
  client,
  name,
  email,
  item,
  price,
  address,
  phone,
  note,
  variant,
  supplier
) {
  const auth = new GoogleAuth({
    keyFile: "keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const authClient = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: authClient,
  });
  const todayDate = new Date();

  const insertData = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
    resource: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: 1276989321,
              dimension: "ROWS",
              startIndex: 2,
              endIndex: 3,
            },
            inheritFromBefore: false,
          },
        },
        {
          updateCells: {
            rows: {
              values: [
                {
                  userEnteredValue: {
                    numberValue: orderNo,
                  },
                },
                {
                  userEnteredValue: {
                    formulaValue: `=DATE(${todayDate.getFullYear()}, ${
                      todayDate.getMonth() + 1
                    }, ${todayDate.getDate()})`,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: client,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: name,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: item,
                  },
                },
                {
                  userEnteredValue: {
                    numberValue: price,
                  },
                  userEnteredFormat: {
                    numberFormat: { type: "CURRENCY" },
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: "",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: "",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: "",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: "",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue:
                      address.addressLine +
                      ", " +
                      address.city +
                      ", " +
                      address.subdivision +
                      " " +
                      address.postalCode +
                      ", " +
                      address.country,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: email,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: phone,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: "",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: note,
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: "Order Received",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue:
                      variant?.length > 0 ? JSON.stringify(variant) : "",
                  },
                },
                {
                  userEnteredValue: {
                    stringValue: supplier,
                  },
                },
              ],
            },
            fields: "*",
            range: {
              sheetId: 1276989321,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: 19,
            },
          },
        },
        {
          updateBorders: {
            range: {
              sheetId: 1276989321,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: 19,
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
