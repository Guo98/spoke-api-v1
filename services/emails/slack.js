import { sendAzureEmail } from "../sendEmail.js";

export async function sendSlackRequestEmail(body) {
  try {
    console.log("sendSlackRequestEmail() => Starting function.");
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.com",
      content: {
        subject: "Slack Request Email",
        html: generateSlackBody(body),
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
      `sendSlackRequestEmail() => Successfully sent slack request email: ${JSON.stringify(
        response
      )}`
    );
    return true;
  } catch (e) {
    console.log(
      `sendSlackRequestEmail() => Error in sending slack request email: ${JSON.stringify(
        e
      )}`
    );
    return false;
  }
}

function generateSlackBody(body) {
  const {
    item,
    recipient_name,
    address,
    email,
    phone_number,
    notes,
    shipping,
    requestor_name,
    return_box,
  } = body;
  const item_blk = `<div dir="ltr"><b>Slack Request</b><br><br>Item Name: ${item}</div><div dir="ltr"><br></div>`;
  const name_blk = `<div>Recipient Name: ${recipient_name}</div><div><br></div>`;
  const addr_blk = `<div>Recipient Address: ${address}</div><div><br></div>`;
  const email_blk = `<div>Recipient Email Address: <a href="mailto:${email}" target="_blank">${email}</a></div><div><br></div>`;
  const pn_blk = `<div>Recipient Phone Number: ${phone_number}</div><div><br></div>`;
  const shipping_blk = `<div>Shipping: ${shipping}</div><div><br></div>`;
  const notes_blk = notes.devices ? `<div>Notes: ${notes.devices}</div>` : "";
  const requestor_blk = `<div>Requestor Username: ${requestor_name}</div><div><br></div>`;
  const return_box_blk = return_box
    ? `<div>Include Return Box: YES</div><div><br></div>`
    : "";

  const emailBody = `<div dir="ltr" data-smartmail="gmail_signature">${requestor_blk}${item_blk}${return_box_blk}${name_blk}${addr_blk}${email_blk}${pn_blk}${shipping_blk}${notes_blk}<div dir="ltr"><br></div></div>`;
  return emailBody;
}
