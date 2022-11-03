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
        plainText: emailBody,
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
  const emailBody = `Hi ${name},

  We’ve been informed by ${company} that you have old / faulty equipment to return. We will be handling the return of this equipment.
  
  You can expect to receive a box with a prepaid return label. All you need to do is put the device (along with the charger) into the box and mail it back.
  
  Can you please confirm the following mailing address is accurate:
  ${address}
  
  Thanks & let us know if you have any questions!
  `;
  return emailBody;
}

function generateOffboardingEmailBody(company, name, address) {
  const emailBody = `Hi ${name},
  
  We’ve been informed by ${
    company === "Bowery" ? "Bowery Valuation" : company
  } that you are departing. As part of the offboarding process, we will be handling the return of your laptop.
  You can expect to receive a box with a prepaid return label. When you receive the box, please ensure to complete the following:

  1. Log out of all accounts on the device (especially iCloud if you have an Apple device)

  2. Place the device (along with the charger) into the box

  3. Apply the return label and mail the box back

  The box will be sent to:
  ${address}
  
  If you have any questions or the mailing address is incorrect, please let us know by emailing ddonhaue@withspoke.io.
  `;

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

export { sendEmail, sendConfirmation };
