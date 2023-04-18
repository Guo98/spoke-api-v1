import { sendSupportEmail } from "../sendEmail.js";
import { determineContainer } from "../../utils/utility.js";
import { inventoryDBMapping } from "../../utils/mappings/inventory.js";

function createLaptopObj(item, type) {
  const randoId = (Math.random() + 1).toString(36).substring(7);
  const newItem = {
    name: item.name,
    location: item.location,
    id: randoId,
    new_device: true,
    serial_numbers: [
      {
        sn: type,
        status: "In Progress",
        quantity: item.quantity,
        date_requested: new Date().toLocaleDateString("en-US"),
      },
    ],
    image_source:
      "https://spokeimages.blob.core.windows.net/image/defaultlaptop.jpeg",
  };
  return newItem;
}

async function requestInventory(res, body, inventoryDB) {
  const { client, name, requestor_email, request_type, items, notes, id } =
    body;

  const containerId = determineContainer(client);
  if (containerId !== "") {
    if (request_type === "a top up") {
      console.log(
        `/requestInventory/${client} => Starting top up DB function.`
      );
      for (let i = 0; i < items.length; i++) {
        const deviceId = inventoryDBMapping[items[i].name]?.[items[i].location];
        if (deviceId) {
          try {
            console.log(
              `/requestInventory/${client} => Updating container: ${containerId} with top up for: ${deviceId} with quantity: ${items[i].quantity}`
            );
            let inventoryRes = await inventoryDB.updateLaptopInventory(
              containerId,
              deviceId,
              "Top Up",
              items[i].quantity
            );
            console.log(
              `/requestInventory/${client} => Successfully updated container: ${containerId} with top up for: ${deviceId}`
            );
            res.json({ status: "Successful" });
          } catch (e) {
            console.log(
              `/requestInventory/${client} => Error in updating (top up) inventory in DB container: ${containerId}. For device: ${items[i].name} and quantity: ${items[i].quantity}.`
            );
            res
              .status(500)
              .json({ status: "Error updating top up for device" });
          }
        } else {
          console.log(
            `/requestInventory/${client} => Couldn't find device id for device: ${items[i].name} at ${items[i].location}. Quantity: ${items[i].quantity}`
          );
          res.status(500).json({ status: "Error finding device for top up" });
        }
      }
    } else if (request_type === "to send a device to Spoke") {
      console.log(
        `/requestInventory/${client} => Starting send to Spoke DB function.`
      );
      const deviceId = inventoryDBMapping[items[0].name]?.[items[0].location];

      if (deviceId) {
        try {
          console.log(
            `/requestInventory/${client} => Updating db container: ${containerId} for send to spoke existing device: ${deviceId} with quantity: ${items[0].quantity}`
          );
          let inventoryRes = await inventoryDB.updateLaptopInventory(
            containerId,
            deviceId,
            "Send to Spoke",
            items[0].quantity
          );
          console.log(
            `/requestInventory/${client} => Successfully updated db container: ${containerId} for send to spoke existing device: ${deviceId}`
          );
          res.json({ status: "Successful" });
        } catch (e) {
          console.log(
            `/requestInventory/${client} => Error updating db container: ${containerId} for send to spoke existing device: ${deviceId} with quantity: ${items[0].quantity}`
          );
          res
            .status(500)
            .json({ status: "Error in updating send to spoke in db" });
        }
      } else {
        const newItem = createLaptopObj(items[0], "Send to Spoke");
        try {
          console.log(
            `/requestInventory/${client} => Updating db container: ${containerId} for send to spoke new device: ${JSON.stringify(
              newItem
            )}`
          );
          let inventoryRes = await inventoryDB.addItem(containerId, newItem);
          console.log(
            `/requestInventory/${client} => Successfully updated db container: ${containerId} for send to spoke new device.`
          );
          res.json({ status: "Successful" });
        } catch (e) {
          console.log(
            `/requestInventory/${client} => Error updating db container: ${containerId} for send to spoke new device: ${JSON.stringify(
              newItem
            )}`
          );
          res.status(500).json({ status: "Error" });
        }
      }
    } else {
      console.log(
        `/requestInventory/${client} => Starting new device DB function for container: ${containerId}.`
      );
      const newItem = createLaptopObj(items[0], "New Device");
      try {
        console.log(
          `/requestInventory/${client} => Updating db container: ${containerId} for new device: ${JSON.stringify(
            newItem
          )}`
        );
        let inventoryRes = await inventoryDB.addItem(containerId, newItem);
        console.log(
          `/requestInventory/${client} => Successfully updated db container: ${containerId} for new device.`
        );
        res.json({ status: "Successful" });
      } catch (e) {
        console.log(
          `/requestInventory/${client} => Error updating db container: ${containerId} for new device: ${JSON.stringify(
            newItem
          )}`
        );
        res.status(500).json({ status: "Error in updating new device for db" });
      }
    }
  } else {
    console.log(
      `/requestInventory/${client} => Did not find a db container for client.`
    );
    res.status(500).json({ status: "Error, client doesn't exist" });
  }

  try {
    const inventoryObj = {
      type: "inventory",
      ...body,
    };
    console.log(
      `/requestInventory/${client} => Starting sendSupportEmail function with body: ${JSON.stringify(
        inventoryObj
      )}`
    );
    const emailResp = await sendSupportEmail(inventoryObj);
    console.log(`/requestInventory/${client} => Sent support email.`);
  } catch (e) {
    console.log(
      `/requestInventory/${client} => sendSupportEmail error. Error: ${e}`
    );
  }
}

export default requestInventory;
