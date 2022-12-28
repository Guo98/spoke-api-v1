import { EmailClient } from "@azure/communication-email";
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

const fedexTrackingEmail =
  "https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=";

async function sendEmail(body) {
  try {
    console.log("Sending tracking email with body: ", body);
    let client = new EmailClient(connectionString);
    //send mail
    const emailMessage = {
      sender: "DoNotReply@withspoke.io",
      content: {
        subject: `Offboarding Tracking - Subject: {Company Name} Equipment Return`,
        plainText: generateTrackingEmailBody(body.name, body.tracking_number),
      },
      recipients: {
        to: [
          {
            email: body.email,
          },
        ],
      },
    };
    var response = await client.send(emailMessage);
    console.log("Sent tracking email: ", response);
    return true;
  } catch (e) {
    console.error("Send tracking email error: ", e);
    return false;
  }
}

async function sendAftershipCSV(content, order_no) {
  try {
    // console.log("Sending tracking email with body: ", body);
    let client = new EmailClient(connectionString);
    //send mail
    const attachment = {
      name: `${order_no}_tracking.txt`,
      attachmentType: "txt",
      contentBytesBase64: content,
    };
    const emailMessage = {
      sender: "DoNotReply@withspoke.io",
      content: {
        subject: "[BETA Testing] Aftership Tracking CSV",
        plainText: "Please import the attached csv into aftership. ",
      },
      recipients: {
        to: [
          {
            email: "andy@withspoke.com",
          },
          {
            email: "info@withspoke.com",
          },
        ],
      },
      attachments: [attachment],
    };
    var response = await client.send(emailMessage);
    console.log("Sent tracking email: ", response);
    return true;
  } catch (e) {
    console.error("Send tracking email error: ", e);
    return false;
  }
}

async function sendConfirmation(body) {
  // company, name, address
  const { company, name, email, requestor_email, type } = body;
  try {
    console.log("Sending confirmation email with body: ", body);
    let client = new EmailClient(connectionString);
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
      sender: "DoNotReply@withspoke.io",
      content: {
        subject: emailSubject,
        html: emailBody,
      },
      recipients: {
        to: [
          {
            email: email,
          },
        ],
        bCC: [
          {
            email: requestor_email,
          },
          {
            email: "offboarding@withspoke.com",
          },
        ],
      },
    };
    var response = await client.send(emailMessage);
    console.log("Sent confirmation email: ", response);
    return true;
  } catch (e) {
    console.error("Send confirmation email error: ", e);
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

export { sendEmail, sendConfirmation, sendAftershipCSV };
