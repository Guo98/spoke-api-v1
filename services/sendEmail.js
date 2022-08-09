import { EmailClient } from "@azure/communication-email";
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

async function sendEmail(body) {
  try {
    console.log("Sending tracking email with body: ", body);
    let client = new EmailClient(connectionString);
    //send mail
    const emailMessage = {
      sender: "DoNotReply@withspoke.io",
      content: {
        subject: "Spoke Offboarding Tracking",
        plainText: `Hi ${body.name}, Your offboarding tracking number is: ${body.tracking_number}`
      },
      recipients: {
        to: [
          {
            email: body.email
          }
        ]
      }
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
  const { company, name, address, email } = body;
  try {
    console.log("Sending confirmation email with body: ", body);
    let client = new EmailClient(connectionString);
    //send mail
    const emailMessage = {
      sender: "DoNotReply@withspoke.io",
      content: {
        subject: `${company} Equipment Return`,
        plainText: generateConfirmationEmailBody(company, name, address)
      },
      recipients: {
        to: [
          {
            email: email
          }
        ]
      }
    };
    var response = await client.send(emailMessage);
    console.log("Sent confirmation email: ", response);
    return true;
  } catch (e) {
    console.error("Send confirmation email error: ", e);
    return false;
  }
}

function generateConfirmationEmailBody(company, name, address) {
  const emailBody = `Hi ${name},\n\nWe've been informed by ${company} that you are departing. As part of your offboarding process, we will be handling the return of your laptop.\nYou can expect to receive a box with a prepaid return label. All you need to do is put the device (along with the charger) into the box and mail it back.\nCan you please confirm the following mailing address is accurate:\n\t\u2022 ${address}\nThanks & let us know if you have any questions!\n\nBest regards,\nSpoke`;
  return emailBody;
}

export { sendEmail, sendConfirmation };
