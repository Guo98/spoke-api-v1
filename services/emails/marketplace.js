import { sendAzureEmail } from "../sendEmail.js";

export async function sendMarketplaceRequestEmail(body) {
  const {
    client,
    device_type,
    specs,
    color,
    notes: { device, recipient },
    order_type,
    recipient_name,
    address,
    email,
    phone_number,
    shipping_rate,
    requestor_email,
    type,
    quantity,
  } = body;
  try {
    console.log(`sendMarketplaceRequestEmail() => Starting function.`);
    let emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject:
          type === "userrequest"
            ? client + ": New Marketplace Request"
            : "Quote Available for Marketplace Request",
        html: generateMarketplaceRequestEmail(
          requestor_email,
          device_type,
          specs,
          color,
          order_type,
          device,
          recipient_name,
          address,
          email,
          phone_number,
          recipient,
          shipping_rate,
          quantity,
          type
        ),
      },
      recipients: {
        to:
          type === "userrequest"
            ? [
                {
                  address: "info@withspoke.com",
                },
              ]
            : [
                {
                  address: requestor_email,
                },
              ],
      },
    };
    if (type !== "userrequest") {
      emailMessage.recipients.bcc = [{ address: "info@withspoke.com" }];
    }
    const response = await sendAzureEmail(emailMessage);
    console.log(
      `sendMarketplaceRequestEmail() => Successfully sent market request email: ${JSON.stringify(
        response
      )}`
    );
    return true;
  } catch (e) {
    console.log(
      `sendMarketplaceRequestEmail() => Error in sending market request email: ${e}`
    );
    return false;
  }
}

export async function sendMarketplaceResponse(body) {
  try {
    console.log("sendMarketplaceResponse() => Starting function.");
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject: body.approved
          ? "Marketplace Approval Request"
          : "Marketplace Denial Request",
        html: generateMarketplaceResponseBody(body),
      },
      recipients: {
        to: [
          {
            address: "info@withspoke.com",
          },
        ],
      },
    };
    const response = await sendAzureEmail(emailMessage);
    console.log(
      `sendMarketplaceResponse() => Successfully sent marketplace response email: ${JSON.stringify(
        response
      )}`
    );
    return true;
  } catch (e) {
    console.log(
      `sendMarketplaceResponse() => Error in sending marketplace response email: ${JSON.stringify(
        e
      )}`
    );
    return false;
  }
}

function generateMarketplaceRequestEmail(
  requestor_email,
  item_name,
  specs,
  color,
  request_type,
  item_notes,
  name,
  address,
  email,
  phone,
  emp_notes,
  shipping,
  quantity,
  type
) {
  const emailBody = `<div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><b>New Item Request:</b></div><div dir="ltr"><br></div><div dir="ltr">Requestor Email: ${requestor_email}</div><div dir="ltr"><br></div><div dir="ltr">Item Name: ${item_name}</div><div dir="ltr"><br></div><div dir="ltr">Specs: ${specs}</div><div dir="ltr"><br></div><div dir="ltr">Color: ${color}</div><div dir="ltr"><br></div><div dir="ltr">Quantity: ${quantity}</div><div dir="ltr"><br></div><div dir="ltr">Item Notes: ${item_notes}</div><div dir="ltr"><br></div><div dir="ltr">Request Type: ${request_type}</div>${
    request_type === "Hold in Inventory"
      ? ""
      : `<div dir="ltr"><br></div><div dir="ltr">Recipient Name: ${name}</div><div dir="ltr"><br></div><div dir="ltr">Address: ${address}</div><div dir="ltr"><br></div><div dir="ltr">Email Address: <a href=${email} target="_blank">${email}</a></div><div dir="ltr"><br></div><div dir="ltr">Phone Number: ${phone}<br></div><div dir="ltr"><br></div><div dir="ltr">Shipping Rate: ${shipping}</div><div dir="ltr"><br></div><div dir="ltr">Employee Notes: ${emp_notes}</div>`
  }</div>`;

  if (type === "approvalemail") {
    let approvalEmailBody =
      `<div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr">The following marketplace request is ready for your review. Please approve or deny the quote <a href="https://manage.withspoke.com/approvals" target="_blank">here</a>.</div><div dir="ltr"><br></div>` +
      emailBody;

    return approvalEmailBody;
  }

  return emailBody;
}

export function generateMarketplaceResponseBody(body) {
  const { approved, item_name, recipient_name, recipient_address, reason } =
    body;

  const emailBody = `<div dir="ltr" data-smartmail="gmail_signature"><div>Marketplace Request: ${
    approved
      ? `<font color="#00ff00">Approved</font>`
      : `<font color="#ff0000">Denied</font>`
  }</div><div><font color="#00ff00"><br></font></div><div><font color="#000000">Item Name: ${item_name}</font></div><div><font color="#000000"><br></font></div><div><span style="color:rgb(0,0,0)">Recipient Name: ${recipient_name}</span><br></div><div><font color="#000000"><br></font></div><div><font color="#000000">Recipient Address: ${recipient_address}<br><br></font></div>${
    !approved
      ? `<div><font color="#000000">Reason for Denial: ${reason}<br><br></font></div>`
      : ""
  }</div>`;

  return emailBody;
}
