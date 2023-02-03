import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../utils/config.js";
import { Inventory } from "../models/inventory.js";
import { checkJwt } from "../services/auth0.js";
import { inventoryDBMapping } from "../utils/mappings/inventory.js";
import { determineContainer } from "../utils/utility.js";
import {
  createAdminDeploy,
  createOffboardRow,
} from "../utils/googleSheetsRows.js";
import { addOrderRow } from "../services/googleSheets.js";
import { sendSupportEmail } from "../services/sendEmail.js";

const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});

const inventory = new Inventory(cosmosClient, "Inventory", "Mock");

inventory
  .init((err) => {
    console.log("cosmos inventory db init err: ", err);
  })
  .catch((err) => {
    console.error("cosmos inventory db shutting down because of error: ", err);
    process.exit(1);
  });

const router = Router();

router.get("/getInventory/:company", checkJwt, async (req, res) => {
  const company = req.params.company;
  const dbContainer = determineContainer(company);
  console.log(`/getInventory/${company} => Starting route.`);
  if (dbContainer !== "") {
    console.log(
      `/getInventory/${company} => Getting inventory from db: ${dbContainer}.`
    );
    try {
      const inventoryRes = await inventory.getAll(dbContainer);

      inventoryRes.forEach((device) => {
        delete device._rid;
        delete device._self;
        delete device._etag;
        delete device._attachments;
        delete device._ts;
      });
      console.log(`/getInventory/${company} => Ending route. Successful.`);
      res.json({ data: inventoryRes });
    } catch (e) {
      console.log(
        `/getInventory/${company} => Error retrieving inventory from container: ${dbContainer}. Error: ${e}.`
      );
      res.status(500).json({ data: [] });
    }
  } else {
    console.log(
      `/getInventory/${company} => Ending route. Error company doesn't exist in DB.`
    );

    res.status(500).json({ data: [] });
  }
});

/**
 * @param {string} client
 * @param {string} first_name
 * @param {string} last_name
 * @param {string} address
 * @param {string} email
 * @param {string} phone_number
 * @param {string} shipping
 * @param {string} note
 * @param {string} device_name
 * @param {string} serial_number
 * @param {string} device_location
 */
router.post("/deployLaptop", checkJwt, async (req, res) => {
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
  } = req.body;
  console.log(`/deployLaptop/${client} => Starting route.`);
  const containerId = determineContainer(client);

  const deviceId = inventoryDBMapping[device_name][device_location];

  let inventoryRes = await inventory.getItem(containerId, deviceId);

  let specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
    (device) => device.sn === serial_number
  );

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
      specificLaptop.email = email;
      specificLaptop.address = address;
      specificLaptop.phone_number = phone_number;
      specificLaptop.date_deployed = formattedDate;
      try {
        console.log(
          `/deployLaptop/${client} => Updating laptop in container: ${containerId}.`
        );
        await inventory.updateDevice(
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
        requestor_email
      );

      try {
        console.log(
          `/deployLaptop/${client} => Adding laptop to admin order sheet.`
        );
        const resp = addOrderRow(
          deployValues,
          "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
          1579665041,
          12
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
  }
  console.log(`/deployLaptop/${client} => Ending route.`);
  res.send({ status: "Success" });
});

router.post("/offboarding", checkJwt, async (req, res) => {
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
  } = req.body;
  console.log(`/offboarding/${client} => Starting route.`);
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
  const containerId = determineContainer(client);

  const deviceId = inventoryDBMapping[device_name][device_location];

  let inventoryRes = await inventory.getItem(containerId, deviceId);

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
      try {
        console.log(
          `/offboarding/${client} => Updating container: ${containerId} with updated obj: ${JSON.stringify(
            specificLaptop
          )}`
        );
        await inventory.updateDevice(
          deviceId,
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
  console.log(`/offboarding/${client} => Ending route.`);
  res.send({ status: "Success" });
});

/**
 * @param {string} client
 * @param {string} requestor_name
 * @param {string} requestor_email
 * @param {string} request_type
 * @param {object} devices
 * @param {string} notes
 */
router.post("/requestInventory", checkJwt, async (req, res) => {
  const { client, name, requestor_email, request_type, items, notes } =
    req.body;
  try {
    const inventoryObj = {
      type: "inventory",
      ...req.body,
    };
    const emailResp = await sendSupportEmail(inventoryObj);
  } catch (e) {
    console.log("/requestInventory => sendSupportEmail error");
    res.status(500).json({ status: "Error in sending email" });
  }
  const containerId = determineContainer(client);
  if (request_type === "a top up") {
    console.log("/requestInventory => Starting top up DB function.");
    for (let i = 0; i < items.length; i++) {
      const deviceId = inventoryDBMapping[items[i].name][items[i].location];
      try {
        console.log(
          `/requestInventory => Updating container: ${containerId} with top up for: ${deviceId}.`
        );
        let inventoryRes = await inventory.updateLaptopInventory(
          containerId,
          deviceId,
          "Top Up",
          items[i].quantity
        );
      } catch (e) {
        console.log(
          `/requestInventory => Error in updating inventory in DB container: ${containerId}.`
        );
        res.status(500).json({ status: "Error" });
      }
    }
  } else if (request_type === "to send a device to Spoke") {
    console.log("/requestInventory => Starting send to Spoke DB function.");
    let deviceId = undefined;
    if (inventoryDBMapping[items[0].name]) {
      deviceId = inventoryDBMapping[items[0].name][items[0].location];
    }

    if (deviceId) {
      try {
        console.log(
          `/requestInventory => Updating db container: ${containerId} for send to spoke existing device: ${deviceId}`
        );
        let inventoryRes = await inventory.updateLaptopInventory(
          containerId,
          deviceId,
          "Send to Spoke",
          items[0].quantity
        );
      } catch (e) {
        console.log(
          `/requestInventory => Error updating db container: ${containerId} for send to spoke existing device: ${deviceId}`
        );
        res.status(500).json({ status: "Error" });
      }
    } else {
      const newItem = createLaptopObj(items[0], "Send to Spoke");
      try {
        console.log(
          `/requestInventory => Updating db container: ${containerId} for send to spoke new device: ${JSON.stringify(
            newItem
          )}`
        );
        let inventoryRes = await inventory.addItem(containerId, newItem);
      } catch (e) {
        console.log(
          `/requestInventory => Error updating db container: ${containerId} for send to spoke new device: ${JSON.stringify(
            newItem
          )}`
        );
        res.status(500).json({ status: "Error" });
      }
    }
  } else {
    console.log(
      `/requestInventory => Starting new device DB function for container: ${containerId}.`
    );
    const newItem = createLaptopObj(items[0], "New Device");
    try {
      console.log(
        `/requestInventory => Updating db container: ${containerId} for new device: ${JSON.stringify(
          newItem
        )}`
      );
      let inventoryRes = await inventory.addItem(containerId, newItem);
    } catch (e) {
      console.log(
        `/requestInventory => Error updating db container: ${containerId} for new device: ${JSON.stringify(
          newItem
        )}`
      );
      res.status(500).json({ status: "Error" });
    }
  }
  console.log(`/requestInventory => Ending route.`);
  res.json({ status: "Successful" });
});

function createLaptopObj(item, type) {
  const randoId = (Math.random() + 1).toString(36).substring(7);
  const newItem = {
    name: item.name,
    location: item.location,
    id: randoId,
    new_device: true,
    serial_numbers: [
      { sn: type, status: "In Progress", quantity: item.quantity },
    ],
    image_source:
      "https://spokeimages.blob.core.windows.net/image/defaultlaptop.jpeg",
  };
  return newItem;
}

export default router;
