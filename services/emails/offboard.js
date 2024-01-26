import { sendAzureEmail } from "../sendEmail.js";

export async function sendReturnConfirmation(body) {
  // company, name, address
  const { company, name, email, requestor_email, type } = body;
  try {
    console.log("sendReturnConfirmation() => Starting function:", body);
    //send mail
    let emailBody = "";
    let emailSubject = "";
    if (type === "Offboarding" || type === "Offboard") {
      emailBody = generateOffboardingEmailBody(company, name, body.address);
      emailSubject = `[Action Required] ${company} Equipment Return`;
    } else {
      emailBody = generateReturnEmailBody(company, name, body.address);
      emailSubject = `[Action Required] ${company} Equipment Return`;
    }
    const emailMessage = {
      senderAddress: "info@withspoke.com",
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
      "sendReturnConfirmation() => Successfully sent confirmation email:",
      response
    );
    return true;
  } catch (e) {
    console.error(
      "sendReturnConfirmation() => Error in sending confirmation email:",
      e
    );
    return false;
  }
}

export async function sendRollingNotification(client, name, email) {
  console.log(`sendRollingNotification(${client}) => Starting function.`);
  try {
    const email_message = {
      senderAddress: "info@withspoke.com",
      content: {
        subject: "Reminder Return",
        html: generateRollingNotification(client, name),
      },
      recipients: {
        to: [
          {
            address: email,
          },
        ],
      },
    };

    // const response = await sendAzureEmail(email_message);
    console.log(
      `sendRollingNotification(${client}) => Successfully sent rolling notification.`
    );
    return true;
  } catch (e) {
    console.log(
      `sendRollingNotification(${client}) => Error in sending email:`,
      e
    );
    return false;
  }
}

function generateReturnEmailBody(company, name, address) {
  if (company !== "Automox") {
    const emailBody = `<div dir="ltr">Hi ${name},<br><br><div>We’ve been informed by ${
      company === "Bowery" ? "Bowery Valuation" : company
    } that you have old / faulty equipment to return. <b>We will be handling the return of this equipment. You can expect to receive a box with a prepaid return label.</b> When you receive the box, please ensure to complete the following:<br><br></div><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box<br>3. Apply the return label and mail the box back<br><br></div><div>Can you please confirm the following mailing address is accurate:</div><div>${address}</div><div><br></div><div>If you have any questions or the mailing address is incorrect, please let us know by emailing Spoke at <a href="mailto:info@withspoke.com" target="_blank">info@withspoke.com</a>.<br clear="all"><div><div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div></div></div></div>`;

    return emailBody;
  } else {
    const emailBody = `<div dir="ltr">Hello! We are Spoke, a service partner with Automox and we will be here to assist you with the return of this device.<div>This is an automated message, if you were instructed not to return the device by the People team or IT, please forward this email to <a href="mailto:helpdesk@automox.com" target="_blank">helpdesk@automox.com</a> so IT can assist you further.</div><div><br></div><div>You can expect to receive a box with a prepaid return label. When you receive the box, please ensure to complete the following:</div><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box</div><div>3. Apply the included return label and drop the box at the nearest shipper, indicated by the label. (FedEx, UPS, USPS)</div><div><br></div><div>Can you please confirm the following mailing address is accurate:</div><div>${name}, ${address}</div><div><br></div><div>If you have any questions or the mailing address is incorrect, please let us know by emailing Spoke at <a href="mailto:info@withspoke.com" target="_blank">info@withspoke.com</a>.<br clear="all"><div><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div></div></div></div>`;
    return emailBody;
  }
}

function generateOffboardingEmailBody(company, name, address) {
  if (company !== "Automox") {
    const emailBody = `<div dir="ltr">Hi ${name},<br><br><div>We’ve been informed by ${
      company === "Bowery" ? "Bowery Valuation" : company
    } that you are departing. <b>As part of the offboarding process, we will be handling the return of your laptop. You can expect to receive a box with a prepaid return label.</b> When you receive the box, please ensure to complete the following:<br><br></div><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box<br>3. Apply the return label and mail the box back<br><br></div><div>The box will be sent to:</div><div>${address}</div><div><br></div><div>If you have any questions or the mailing address is incorrect, please let us know by emailing Spoke at <a href="mailto:info@withspoke.com" target="_blank">info@withspoke.com</a>.<br clear="all"><div><div dir="ltr" data-smartmail="gmail_signature"><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div></div></div></div>`;

    return emailBody;
  } else {
    const emailBody = `<div dir="ltr">Hello! We are a service partner with Automox, and we will be here to assist you with the return of any device.<div>This is an automated message, if you were instructed not to return the device by the People team or IT, please forward this email to <a href="mailto:helpdesk@automox.com" target="_blank">helpdesk@automox.com</a> so IT can assist you further.</div><div><br></div><div>You can expect to receive a box with a prepaid return label. When you receive the box, please ensure to complete the following:</div><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box</div><div>3. Apply the included return label and drop the box at the nearest shipper, indicated by the label. (FedEx, UPS, USPS)</div><div><br></div><div>The box will be sent to:</div><div>${name}, ${address}</div><div><br></div><div>If you have any questions or the mailing address is incorrect, please let us know by emailing Spoke at <a href="mailto:info@withspoke.com" target="_blank">info@withspoke.com</a>.<br clear="all"><div><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr><td style="margin:0.1px"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td valign="top" style="padding:0px 8px 0px 0px;vertical-align:top"></td><td valign="top" style="margin:0.1px;font-size:1em;padding:0px 15px 0px 8px;vertical-align:top"><br></td></tr></tbody></table></td></tr></tbody></table></div></div></div></div></div>`;
    return emailBody;
  }
}

function generateRollingNotification(client, name) {}
