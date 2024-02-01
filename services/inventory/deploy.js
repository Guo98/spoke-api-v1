import { determineContainer } from "../../utils/utility.js";
import { createAdminDeploy } from "../../utils/googleSheetsRows.js";
import { addOrderRow } from "../googleSheets.js";
import { createYubikeyShipment } from "../../utils/yubikey.js";

async function deployLaptop(res, body, inventoryDB) {
  const {
    client,
    first_name,
    last_name,
    address,
    email,
    phone_number,
    shipping,
    note,
    device_name,
    serial_number,
    device_location,
    requestor_email,
    id,
    addons,
  } = body;
  console.log(`deployLaptop() => Starting function:`, body);
  const containerId = determineContainer(client);

  if (containerId !== "") {
    let deviceId = id;

    if (deviceId) {
      let inventoryRes = await inventoryDB.getItem(containerId, deviceId);

      let specificLaptopIndex = -1;

      if (!serial_number) {
        specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
          (device) => device.status === "In Stock" && device.condition === "New"
        );

        if (specificLaptopIndex < 0) {
          specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
            (device) => device.status === "In Stock"
          );
        }
      } else {
        specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
          (device) =>
            device.sn === serial_number && device.status === "In Stock"
        );
      }

      if (specificLaptopIndex > -1) {
        let specificLaptop = inventoryRes.serial_numbers[specificLaptopIndex];
        console.log(
          `/deployLaptop/${client} => Found specific laptop index: ${JSON.stringify(
            specificLaptop
          )}`
        );
        const todayDate = new Date();
        todayDate.toLocaleString("en-US", { timeZone: "America/New_York" });
        const formattedDate =
          todayDate.getMonth() +
          1 +
          "/" +
          todayDate.getDate() +
          "/" +
          todayDate.getFullYear();

        if (specificLaptop.status === "In Stock") {
          specificLaptop.status = "Deployed";
          specificLaptop.first_name = first_name;
          specificLaptop.last_name = last_name;
          specificLaptop.full_name = first_name + " " + last_name;
          specificLaptop.email = email;
          specificLaptop.address = address;
          specificLaptop.phone_number = phone_number;
          specificLaptop.date_deployed = formattedDate;
          try {
            console.log(
              `/deployLaptop/${client} => Updating laptop in container: ${containerId}.`
            );
            await inventoryDB.updateDevice(
              deviceId,
              specificLaptop,
              containerId,
              specificLaptopIndex
            );
            console.log(
              `/deployLaptop/${client} => Finished updating laptop in container: ${containerId}.`
            );
          } catch (e) {
            console.log(
              `/deployLaptop/${client} => Error updating laptop in container: ${containerId}. Error: ${e}`
            );
            res.status(500).send({ status: "Error" });
          }

          let yubikey_index = -1;
          if (addons) {
            yubikey_index = addons.findIndex((i) => i.includes("yubikey"));
          }
          let shipment_id = "";
          if (yubikey_index > -1) {
            console.log(`deployLaptop() => Ordering yubikey.`);
            try {
              const yubikeyBody = {
                firstname: first_name,
                lastname: last_name,
                email: email,
                phone_number: phone_number,
                address: {
                  addressLine: address.al1,
                  addressLine2: address.al2,
                  city: address.city,
                  subdivision: address.state,
                  postalCode: address.postal_code,
                  country: address.country_code,
                },
                quantity: parseInt(addons[yubikey_index].split("x")[0]),
              };

              shipment_id = await createYubikeyShipment(yubikeyBody);
              console.log(`deployLaptop() => Successfully ordered yubikey.`);
            } catch (e) {
              console.log(`deployLaptop() => Error in ordering yubikey`, e);
            }
          }

          const deployValues = createAdminDeploy(
            client,
            first_name + " " + last_name,
            device_name,
            serial_number,
            address,
            shipping,
            email,
            phone_number,
            note,
            requestor_email,
            body.warehouse,
            addons,
            shipment_id
          );

          try {
            console.log(
              `/deployLaptop/${client} => Adding laptop to admin order sheet.`
            );
            const resp = addOrderRow(
              deployValues,
              "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
              1579665041,
              15
            );
            console.log(
              `/deployLaptop/${client} => Finish adding laptop to admin order sheet.`
            );
          } catch (e) {
            console.log(
              `/deployLaptop/${client} => Error adding laptop to admin order sheet. Error: ${e}`
            );
            res.status(500).send({ status: "Error" });
          }
        }
      } else {
        console.log(
          `/deployLaptop/${client} => Coudln't find an in stock device. Device Name: ${device_name}. Device Location: ${device_location}`
        );
        res.status(500).json({ status: "Error in finding available device" });
      }
    } else {
      console.log(
        `/deployLaptop/${client} => Device doesn't exist. Device Name: ${device_name}. Device Location: ${device_location}`
      );
      res.status(500).json({ status: "Error in finding device id" });
    }
  }
}

export default deployLaptop;
