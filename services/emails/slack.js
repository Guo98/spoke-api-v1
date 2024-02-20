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
    notes: { devices },
  } = body;
  const emailBody = `<div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><b>Slack Request</b><br><br>Item Name: ${item}</div><div dir="ltr"><br></div><div>Recipient Name: ${recipient_name}</div><div><br></div><div>Recipient Address: ${address}</div><div><br></div><div>Recipient Email Address: <a href="mailto:${email}" target="_blank">${email}</a></div><div><br></div><div>Recipient Phone Number: ${phone_number}</div><div><br></div><div><br></div><div>Notes: ${devices}</div><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div>`;
  return emailBody;
}
