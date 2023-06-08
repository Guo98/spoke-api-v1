import { EmailClient } from "@azure/communication-email";
import { generateMarketplaceResponseBody } from "./emails/marketplace.js";
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

const fedexTrackingEmail =
  "https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=";

export async function sendAzureEmail(emailMessage) {
  try {
    console.log("sendAzureEmail() => Starting function:");
    let client = new EmailClient(connectionString);
    //send mail
    var poller = await client.beginSend(emailMessage);
    const response = await poller.pollUntilDone();
    console.log(
      "sendAzureEmail() => Successfully sent offboarding tracking email:",
      response
    );
    return response;
  } catch (e) {
    console.error(
      "sendAzureEmail() => Error in sending offboarding tracking email:",
      e
    );
    throw e;
  }
}

async function sendEmail(body) {
  try {
    console.log("sendEmail() => Starting function:", body);
    //send mail
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject: `Offboarding Tracking - Subject: {Company Name} Equipment Return`,
        plainText: generateTrackingEmailBody(body.name, body.tracking_number),
      },
      recipients: {
        to: [
          {
            address: body.email,
          },
        ],
      },
    };
    const response = await sendAzureEmail(emailMessage);
    console.log(
      "sendEmail() => Successfully sent offboarding tracking email:",
      response
    );
    return true;
  } catch (e) {
    console.error(
      "sendEmail() => Error in sending offboarding tracking email:",
      e
    );
    return false;
  }
}

async function sendNotificationEmail() {
  try {
    console.log(
      "sendNotificationEmail() => Starting function to send notification email for new deployment."
    );
    //send mail
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject: `Deployment placed for laptop`,
        plainText: "Please refer to google sheets for new deployed laptop",
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

async function sendSupportEmail(body) {
  const { type } = body;
  try {
    console.log("sendSupportEmail() => Starting function:", body);
    //send mail
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject:
          type === "support"
            ? `${body.orderNo && `Order #${body.orderNo} `}Support Email`
            : `New Inventory Request for ${body.client}`,
        html:
          type === "support"
            ? generateSupportEmailBody(body)
            : generateInventoryEmailBody(body),
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
      "sendSupportEmail() => Successfully sent support email:",
      response
    );
    return true;
  } catch (e) {
    console.error("sendSupportEmail() => Error in sending support email:", e);
    return false;
  }
}

async function sendAftershipCSV(content, order_no) {
  try {
    console.log("sendAftershipCSV() => Starting function");
    //send mail
    const attachment = {
      name: `${order_no}_tracking.txt`,
      contentType: "text/plain",
      contentInBase64: content,
    };
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject: "[BETA Testing] Aftership Tracking CSV",
        plainText: "Please import the attached csv into aftership. ",
      },
      recipients: {
        to: [
          {
            address: "andy@withspoke.com",
          },
          {
            address: "info@withspoke.com",
          },
        ],
      },
      attachments: [attachment],
    };
    const response = await sendAzureEmail(emailMessage);
    console.log("sendAftershipCSV() => successfully sent email:", response);
    return true;
  } catch (e) {
    console.error("sendAftershipCSV() => Error sending email:", e);
    return false;
  }
}

async function sendConfirmation(body) {
  // company, name, address
  const { company, name, email, requestor_email, type } = body;
  try {
    console.log("sendConfirmation() => Starting function:", body);
    //send mail
    let emailBody = "";
    let emailSubject = "";
    if (type === "redeployment") {
      emailBody = generateRedeploymentEmailBody(company, name, body.item);
      emailSubject = `Redeployment - Subject: ${company} Equipment Deployment`;
    } else if (type === "Offboarding") {
      emailBody = generateOffboardingEmailBody(company, name, body.address);
      emailSubject = `[Action Required] ${company} Equipment Return`;
    } else {
      emailBody = generateReturnEmailBody(company, name, body.address);
      emailSubject = `[Action Required] ${company} Equipment Return`;
    }
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject: emailSubject,
        html: emailBody,
      },
      recipients: {
        to: [
          {
            address: email,
          },
        ],
        bcc: [
          {
            address: requestor_email,
          },
          {
            address: "offboarding@withspoke.com",
          },
        ],
      },
    };

    const response = await sendAzureEmail(emailMessage);
    console.log(
      "sendConfirmation() => Successfully sent confirmation email:",
      response
    );
    return true;
  } catch (e) {
    console.error(
      "sendConfirmation() => Error in sending confirmation email:",
      e
    );
    return false;
  }
}

async function sendOrderConfirmationEmail(
  requestor_email,
  requestor_name,
  request_type,
  recipient_name,
  device_name,
  shipping
) {
  try {
    console.log(`sendOrderConfirmationEmail() => Starting function.`);
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
      content: {
        subject: request_type + " Confirmation Email",
        html: generateConfirmationEmail(
          requestor_name,
          request_type,
          recipient_name,
          device_name,
          shipping
        ),
      },
      recipients: {
        to: [
          {
            address: requestor_email,
          },
        ],
        bcc: [
          {
            address: "info@withspoke.com",
          },
        ],
      },
    };
    const response = await sendAzureEmail(emailMessage);
    console.log(
      `sendOrderConfirmationEmail() => Successfully sent order confirmation email: ${response}`
    );
    return true;
  } catch (e) {
    console.log(
      `sendOrderConfirmationEmail() => Error in sending order confirmation email: ${e}`
    );
    return false;
  }
}

async function sendSlackRequestEmail(body) {
  try {
    console.log("sendSlackRequestEmail() => Starting function.");
    const emailMessage = {
      senderAddress: "DoNotReply@withspoke.io",
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

async function sendMarketplaceResponse(body) {
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

function generateReturnEmailBody(company, name, address) {
  const emailBody = `<div dir="ltr">Hi ${name},<br><br><div>We’ve been informed by ${
    company === "Bowery" ? "Bowery Valuation" : company
  } that you have old / faulty equipment to return. We will be handling the return of this equipment. You can expect to receive a box with a prepaid return label. When you receive the box, please ensure to complete the following:<br><br></div><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box<br>3. Apply the return label and mail the box back<br><br></div><div>Can you please confirm the following mailing address is accurate:</div><div>${address}</div><div><br></div><div>If you have any questions or the mailing address is incorrect, please let us know by emailing Danny at <a href="mailto:ddonahue@withspoke.io" target="_blank">ddonhaue@withspoke.io</a>.<br clear="all"><div><div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div></div></div></div>`;

  return emailBody;
}

function generateOffboardingEmailBody(company, name, address) {
  const emailBody = `<div dir="ltr">Hi ${name},<br><br><div>We’ve been informed by ${
    company === "Bowery" ? "Bowery Valuation" : company
  } that you are departing. As part of the offboarding process, we will be handling the return of your laptop. You can expect to receive a box with a prepaid return label. When you receive the box, please ensure to complete the following:<br><br></div><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box<br>3. Apply the return label and mail the box back<br><br></div><div>The box will be sent to:</div><div>${address}</div><div><br></div><div>If you have any questions or the mailing address is incorrect, please let us know by emailing Danny at <a href="mailto:ddonhaue@withspoke.io" target="_blank">ddonahue@withspoke.io</a>.<br clear="all"><div><div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div></div></div></div>`;

  return emailBody;
}

function generateSupportEmailBody(body) {
  const { requestor_email, customer_name, support_subject, support_message } =
    body;
  const emailBody = `<div dir="ltr">Requestor Email: <a href="mailto:${requestor_email}" target="_blank">${requestor_email}</a><div><br></div>${
    customer_name &&
    `<div>Customer Name: ${customer_name}</div><div><br></div><div>`
  }Subject: ${support_subject}</div><div><br></div><div>Message: ${support_message}</div><div><br></div></div>`;

  return emailBody;
}

function generateInventoryEmailBody(body) {
  const { client, name, items, notes, requestor_email, request_type } = body;
  const emailBody = `<div dir="ltr">${name} from ${client} has requested ${request_type}<div>${items.map(
    (item) =>
      `<div>Device: ${item.name}, Quantity: ${item.quantity}, Location: ${
        item.location
      } ${
        request_type === "a new device"
          ? ", Specifications: " +
            item.specifications +
            ", Color: " +
            item.color +
            ", reference url: " +
            item.refurl
          : ""
      }</div><div><br></div>`
  )}</div><div>Notes: ${notes}</div><div><br></div><div>Requestor Email: ${requestor_email}</div></div>`;
  return emailBody;
}

function generateRedeploymentEmailBody(company, name, item) {
  const emailBody = `Hi ${name},

  We’re writing to let you know that ${company} are sending you the following: 
  ${item} 
  
  Once the package ships, you will receive a tracking email.
  
  Thanks & if you have any questions, please let us know!
  `;

  return emailBody;
}

function generateTrackingEmailBody(name, tracking_num) {
  const emailBody = `Hi ${name},

  We’ve sent you a return box for your device. As a reminder, all you need to do is place your device (along with the charger) into the box and apply the prepaid label.
  
  You can track the delivery of the return box here: ${tracking_num}
  
  Thanks & if you have any questions, please let us know!
  `;
  return emailBody;
}

function generateConfirmationEmail(
  requestor_name,
  request_type,
  recipient_name,
  device_name,
  shipping
) {
  const emailBody = `<div dir="ltr"><span><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Hi ${requestor_name},</span></p><br><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">This email confirms that we have received the following order:</span></p><ul style="margin-top:0px;margin-bottom:0px"><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt" role="presentation"><span style="font-size:11pt;background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Request: ${request_type}</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt" role="presentation"><span style="font-size:11pt;background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Recipient: ${recipient_name}</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt" role="presentation"><span style="font-size:11pt;background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Device: ${
    device_name !== "" ? device_name : "N/A"
  }</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt" role="presentation"><span style="font-size:11pt;background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Shipping: ${shipping}</span></p></li></ul><br><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">We are working on getting your order out as quickly as we can!</span></p><br><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Once items have shipped, tracking information will be available. It may take up to 24 hours to appear on the Orders page of your portal.</span></p><br><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Best,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial;color:rgb(0,0,0);background-color:transparent;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;vertical-align:baseline;white-space:pre-wrap">Team Spoke</span></p></span><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div>`;
  return emailBody;
}

function generateSlackBody(body) {
  const {
    device_type,
    specs,
    recipient_name,
    address,
    email,
    phone_number,
    ref_url,
    notes: { devices },
  } = body;
  const emailBody = `<div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><b>Slack Request</b><br><br>Item Name: ${device_type}</div><div dir="ltr"><br></div><div dir="ltr">Requested Specs: ${specs}<br><br></div><div>Recipient Name: ${recipient_name}</div><div><br></div><div>Recipient Address: ${address}</div><div><br></div><div>Recipient Email Address: <a href="mailto:${email}" target="_blank">${email}</a></div><div><br></div><div>Recipient Phone Number: ${phone_number}</div><div><br></div><div>Reference URL: ${ref_url}</div><div><br></div><div>Notes: ${devices}</div><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div>`;
  return emailBody;
}

export {
  sendEmail,
  sendConfirmation,
  sendAftershipCSV,
  sendSupportEmail,
  sendNotificationEmail,
  sendOrderConfirmationEmail,
  sendSlackRequestEmail,
  sendMarketplaceResponse,
};
