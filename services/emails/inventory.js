import { sendAzureEmail } from "../sendEmail.js";

export async function sendInventoryDeploymentEmail(body) {
  try {
    console.log(
      "sendNotificationEmail() => Starting function to send notification email for new deployment."
    );
    //send mail
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.com",
      content: {
        subject: `Deployment placed for laptop`,
        html: generateInventoryDeploymentHTML(
          body.requestor_email,
          body.device_name,
          body.serial_number,
          body.note,
          body.first_name + " " + body.last_name,
          body.address,
          body.email,
          body.phone_number,
          body.shipping,
          body.warehouse,
          body.addons
        ),
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
      "sendNotificationEmail() => Successfully sent notification email:",
      response
    );
    return true;
  } catch (e) {
    console.error(
      "sendNotificationEmail() => Error in sending notification email:",
      e
    );
    return false;
  }
}

function generateInventoryDeploymentHTML(
  requestor_email,
  item_name,
  serial_number,
  note,
  recipient_name,
  address,
  email,
  phone,
  shipping,
  warehouse,
  addons
) {
  const req_email_blk = `<div dir="ltr">Requestor Email: ${requestor_email}</div><div dir="ltr"><br></div>`;
  const item_name_blk = `<div dir="ltr">Item Name: ${item_name}</div><div dir="ltr"><br></div>`;
  const serial_number_blk = `<div dir="ltr">Serial Number: ${serial_number}</div><div dir="ltr"><br></div>`;
  const note_blk = `<div dir="ltr">Item Notes: ${note}</div><div dir="ltr"><br></div>`;
  const recipient_name_blk = `<div dir="ltr">Recipient Name: ${recipient_name}</div><div dir="ltr"><br></div>`;
  const address_blk = `<div dir="ltr">Address: ${JSON.stringify(
    address
  )}</div><div dir="ltr"><br></div>`;
  const email_blk = `<div dir="ltr">Recipient Email: ${email}</div><div dir="ltr"><br></div>`;
  const phone_blk = `<div dir="ltr">Recipient Phone: ${phone}</div><div dir="ltr"><br></div>`;
  const shipping_blk = `<div dir="ltr">Shipping: ${shipping}</div><div dir="ltr"><br></div>`;
  const supplier_blk = `<div dir="ltr">Warehouse: ${warehouse}</div><div dir="ltr"><br></div>`;
  let addons_blk = "";

  if (addons.length > 0) {
    addons_blk = `<div dir="ltr">Add Ons Requested: <div><ul>${addons.map(
      (item) => {
        return `<li>${item}</li>`;
      }
    )}</ul></div></div><div dir="ltr"><br></div>`;
  }

  let email_body =
    '<div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><b>Stock Deployment Request:</b></div><div dir="ltr"><br></div>' +
    req_email_blk +
    item_name_blk +
    serial_number_blk +
    note_blk +
    recipient_name_blk +
    address_blk +
    email_blk +
    phone_blk +
    shipping_blk +
    supplier_blk +
    addons_blk;

  return email_body;
}
