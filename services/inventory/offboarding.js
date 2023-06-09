import { createOffboardRow } from "../../utils/googleSheetsRows.js";
import { addOrderRow } from "../googleSheets.js";
import { determineContainer } from "../../utils/utility.js";
import { sendConfirmation } from "../sendEmail.js";

async function inventoryOffboard(res, body, inventoryDB) {
  const {
    serial_number,
    client,
    device_name,
    device_location,
    type,
    recipient_name,
    recipient_email,
    shipping_address,
    phone_num,
    requestor_email,
    note,
    id,
  } = body;
  try {
    console.log(
      `/offboarding/${client} => Adding offboard order to offboarding sheet.`
    );
    const offboardValues = createOffboardRow(
      1,
      client,
      recipient_name,
      recipient_email,
      device_name,
      shipping_address,
      phone_num,
      requestor_email,
      note
    );

    const resp = addOrderRow(
      offboardValues,
      "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
      1831291341,
      25
    );
    console.log(
      `/offboarding/${client} => Finished adding offboard order to offboarding sheet.`
    );
  } catch (e) {
    console.log(
      `/offboarding/${client} => Error in adding offboard order to offboarding sheet. Error: ${e}`
    );
    res.status(500).send({ status: "Error" });
  }

  try {
    console.log(
      `/offboarding/${client} => Sending confirmation email for offboarding`
    );
    await sendConfirmation({
      company: client,
      name: recipient_name,
      requestor_email,
      type,
      address: shipping_address,
    });
    console.log(
      `/offboarding/${client} => Finished sending confirmation email for offboarding`
    );
  } catch (e) {
    console.log(
      `/offboarding/${client} => Error sending confirmation email for offboarding`
    );
  }

  const containerId = determineContainer(client);
  if (containerId !== "") {
    if (id) {
      let inventoryRes = await inventoryDB.getItem(containerId, id);

      let specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
        (device) => device.sn === serial_number
      );

      if (specificLaptopIndex > -1) {
        let specificLaptop = inventoryRes.serial_numbers[specificLaptopIndex];
        console.log(
          `/offboarding/${client} => Got laptop index to update in db: ${JSON.stringify(
            specificLaptop
          )}`
        );
        if (specificLaptop.status === "Deployed") {
          specificLaptop.status = type;
          delete specificLaptop.first_name;
          delete specificLaptop.last_name;
          delete specificLaptop.email;
          delete specificLaptop.address;
          delete specificLaptop.phone_number;
          specificLaptop.condition = "Used";
          specificLaptop.date_requested = new Date().toLocaleDateString(
            "en-US"
          );
          try {
            console.log(
              `/offboarding/${client} => Updating container: ${containerId} with updated obj: ${JSON.stringify(
                specificLaptop
              )}`
            );
            await inventoryDB.updateDevice(
              id,
              specificLaptop,
              containerId,
              specificLaptopIndex
            );
            console.log(
              `/offboarding/${client} => Finished updating container: ${containerId} for laptop: ${specificLaptop.sn}`
            );
          } catch (e) {
            console.log(
              `/offboarding/${client} => Error in updating container: ${containerId} for laptop: ${specificLaptop.sn}. Error: ${e}`
            );
            res.status(500).send({ status: "Error" });
          }
        }
      }
    } else {
      console.log(`/offbaording/${client} => Couldn't find device in DB.`);
    }
  } else {
    console.log(
      `/offboarding/${client} => Container doesn't exist in DB for client.`
    );
    res.status(500).json({ status: "Error, client doesn't exist" });
  }
}

export default inventoryOffboard;
