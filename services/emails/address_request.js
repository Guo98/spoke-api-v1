import { sendAzureEmail } from "../sendEmail.js";

export async function sendAddressRequestEmail(client, recipient_email) {
  console.log(`sendAddressRequestEmail(${client}) => Starting function.`);
  let emailMessage = {
    senderAddress: "info@withspoke.com",
    content: {
      subject: `[ACTION REQUIRED] ${client} Equipment Return`,
      html: generateAddressRequestEmail(client),
    },
    recipients: {
      to: [
        {
          address: recipient_email,
        },
      ],
    },
  };

  try {
    console.log(`sendAddressRequestEmail(${client}) => Sending email.`);
    const response = await sendAzureEmail(emailMessage);
    console.log(`sendAddressRequestEmail(${client}) => Sent email.`);
  } catch (e) {
    console.log(
      `sendAddressRequestEmail(${client}) => Error in sending email: `,
      e
    );
  }

  console.log(`sendAddressRequestEmail(${client}) => Finished function.`);
}

function generateAddressRequestEmail(client) {
  const email_body = `<div dir="ltr">Hello! We are Spoke, a service partner with ${client} and we will be assisting you with the return of your device.<br><br>You can expect to receive a box with a prepaid return label. When you receive the box, please ensure to complete the following:<br><div>1. Log out of all accounts on the device (especially iCloud if you have an Apple device)</div><div>2. Place the device (along with the charger) into the box<br></div>3. Apply the included return label and drop the box at the nearest shipper, indicated by the label. (FedEx, UPS, USPS)<br><br><b>Can you please confirm the mailing address you'd like the return box sent to.</b><br><br>If you have any questions, please let us know!<br><br>Best,<br>Team Spoke<br><table width="500" cellspacing="0" cellpadding="0" border="0" style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><tbody><tr style="font-size:1px"><td colspan="2" style="font-size:0px"><a href="https://mysignature.io/editor/?utm_source&amp;#x3D;expiredpixel" style="background-color:transparent" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://mysignature.io/editor/?utm_source%26%23x3D;expiredpixel&amp;source=gmail&amp;ust=1700662758859000&amp;usg=AOvVaw1yIeOUP3BooZEBvor7XZJn"><img src="https://ci4.googleusercontent.com/proxy/b3VceXSKSGqG9MNbFfQBxC_Yq1cVRG01FV6qWrShZ_0UpiG77g787VsC9USKX29STDQ8vmSRF5rGavOgmQ8ViAXGuFm81XUwnSygPQ=s0-d-e1-ft#https://img.mysignature.io/pixel/1126280/signature/308093" alt="" style="border-style:none;max-width:100%;vertical-align:middle" class="CToWUd" data-bit="iit"></a></td></tr></tbody></table><div style="color:rgb(72,101,137);font-family:Montserrat,sans-serif;font-size:17px"><table width="500" cellspacing="0" cellpadding="0" border="0"><tbody><tr><td style="margin:0.1px;line-height:1px;font-size:1px;height:1px">&nbsp;</td></tr></tbody></table></div></div>`;

  return email_body;
}
