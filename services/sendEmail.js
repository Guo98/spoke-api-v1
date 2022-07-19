import { EmailClient } from "@azure/communication-email";
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

async function sendEmail(body) {
  try {
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
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export { sendEmail };
