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
    region,
    ref_url,
    ai_specs,
    supplier,
    return_device,
    addons,
  } = body;
  try {
    console.log(`sendMarketplaceRequestEmail() => Starting function.`);
    let emailMessage = {
      senderAddress: "DoNotReply@withspoke.com",
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
          type,
          region,
          ref_url,
          ai_specs,
          supplier,
          return_device,
          addons
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
      senderAddress: "DoNotReply@withspoke.com",
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
  type,
  region,
  ref_url,
  ai_specs,
  supplier,
  return_device,
  addons
) {
  const req_email_blk = `<div dir="ltr">Requestor Email: ${requestor_email}</div><div dir="ltr"><br></div>`;
  // const item_name_blk = `<div dir="ltr">Item Name: ${item_name}</div><div dir="ltr"><br></div>`;
  // const specs_blk = `<div dir="ltr">Requested Specs: ${specs}</div><div dir="ltr"><br></div>`;
  //  const color_blk = `<div dir="ltr">Color: ${color}</div><div dir="ltr"><br></div>`;
  const req_type_blk = `<div dir="ltr">Request Type: ${
    return_device ? request_type + " + return box" : request_type
  }</div><div dir="ltr"><br></div>`; // Hold in Inventory
  const item_note_blk = `<div dir="ltr">Item Notes: ${item_notes}</div><div dir="ltr"><br></div>`;
  const recipient_name_blk = `<div dir="ltr">Recipient Name: ${name}</div><div dir="ltr"><br></div>`;
  const address_blk = `<div dir="ltr">Address: ${address}</div><div dir="ltr"><br></div>`;
  const email_blk = `<div dir="ltr">Recipient Email: ${email}</div><div dir="ltr"><br></div>`;
  const phone_blk = `<div dir="ltr">Recipient Phone: ${phone}</div><div dir="ltr"><br></div>`;
  const emp_note_blk = `<div dir="ltr">Employee Notes: ${emp_notes}</div><div dir="ltr"><br></div>`;
  const shipping_blk = `<div dir="ltr">Shipping: ${shipping}</div><div dir="ltr"><br></div>`;
  const quantity_blk = `<div dir="ltr">Quantity: ${quantity}</div><div dir="ltr"><br></div>`;
  const region_blk = `<div dir="ltr">Region: ${region}</div><div dir="ltr"><br></div>`;
  // const ref_url_blk = `<div dir="ltr">Reference Url: ${ref_url}</div><div dir="ltr"><br></div>`;
  // const ai_specs_blk = `<div dir="ltr">AI Specs: ${ai_specs}</div><div dir="ltr"><br></div>`;
  // const supplier_blk = `<div dir="ltr">Supplier: ${supplier}</div><div dir="ltr"><br></div>`;
  let addons_blk = "";

  if (addons.length > 0) {
    addons_blk = `<div dir="ltr">Add Ons Requested: <div><ul>${addons.map(
      (item) => {
        return `<li>${item}</li>`;
      }
    )}</ul></div></div><div dir="ltr"><br></div>`;
  }

  let emailBody =
    '<div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><b>New Item Request:</b></div><div dir="ltr"><br></div>' +
    req_type_blk +
    req_email_blk;

  if (supplier) {
    emailBody =
      emailBody +
      `<div dir="ltr">Supplier: ${supplier}</div><div dir="ltr"><br></div>`;
  }

  if (item_name) {
    emailBody =
      emailBody +
      `<div dir="ltr">Item Name: ${item_name}</div><div dir="ltr"><br></div>`;
  }

  if (specs) {
    emailBody =
      emailBody +
      `<div dir="ltr">Requested Specs: ${specs}</div><div dir="ltr"><br></div>`;
  }

  if (ai_specs) {
    emailBody =
      emailBody +
      `<div dir="ltr">AI Specs: ${ai_specs}</div><div dir="ltr"><br></div>`;
  }

  if (color) {
    emailBody =
      emailBody +
      `<div dir="ltr">Color: ${color}</div><div dir="ltr"><br></div>`;
  }

  if (ref_url) {
    emailBody =
      emailBody +
      `<div dir="ltr">Reference Url: ${ref_url}</div><div dir="ltr"><br></div>`;
  }

  if (request_type === "Hold in Inventory") {
    emailBody =
      emailBody +
      region_blk +
      quantity_blk +
      shipping_blk +
      req_email_blk +
      item_note_blk;
  } else {
    emailBody =
      emailBody +
      addons_blk +
      region_blk +
      shipping_blk +
      req_email_blk +
      recipient_name_blk +
      address_blk +
      email_blk +
      phone_blk +
      emp_note_blk;
  }

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
