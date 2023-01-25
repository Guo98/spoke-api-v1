import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../utils/config.js";
import { Inventory } from "../models/inventory.js";
import { checkJwt } from "../services/auth0.js";
import { inventoryDBMapping } from "../utils/mappings/inventory.js";
import { determineContainer } from "../utils/utility.js";
import { addOffboardRow } from "../services/googleSheets.js";
import { createAdminDeploy } from "../utils/googleSheetsRows.js";
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

  if (dbContainer !== "") {
    const inventoryRes = await inventory.getAll(dbContainer);

    inventoryRes.forEach((device) => {
      delete device._rid;
      delete device._self;
      delete device._etag;
      delete device._attachments;
      delete device._ts;
    });
    res.json({ data: inventoryRes });
  } else {
    res.send("Hello World");
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
  } = req.body;

  const containerId = determineContainer(client);

  const deviceId = inventoryDBMapping[device_name][device_location];

  let inventoryRes = await inventory.getItem(containerId, deviceId);

  let specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
    (device) => device.sn === serial_number
  );

  if (specificLaptopIndex > -1) {
    let specificLaptop = inventoryRes.serial_numbers[specificLaptopIndex];
    if (specificLaptop.status === "In Stock") {
      specificLaptop.status = "Deployed";
      specificLaptop.first_name = first_name;
      specificLaptop.last_name = last_name;
      specificLaptop.email = email;
      specificLaptop.address = address;
      specificLaptop.phone_number = phone_number;
      try {
        await inventory.updateDevice(
          deviceId,
          specificLaptop,
          containerId,
          specificLaptopIndex
        );
      } catch (e) {
        res.status(500).send("error updating db");
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
        note
      );

      try {
        const resp = addOrderRow(
          deployValues,
          "1cZKr-eP9bi169yKb5OQtYNX117Q_dr3LNg8Bb4Op7SE",
          1579665041,
          11
        );
      } catch (e) {
        console.log("error adding to spreadsheet");
      }
    }
  }

  res.send({ status: "Success" });
});

router.post("/offboarding", checkJwt, async (req, res) => {
  const { serial_number, client, device_name, device_location, type } =
    req.body;
  // try {
  //   const sheetsResp = await addOffboardRow(req.body);
  // } catch (e) {
  //   console.log("/offboarding => error in google sheets update");
  // }
  const containerId = determineContainer(client);

  const deviceId = inventoryDBMapping[device_name][device_location];

  let inventoryRes = await inventory.getItem(containerId, deviceId);

  let specificLaptopIndex = inventoryRes.serial_numbers.findIndex(
    (device) => device.sn === serial_number
  );

  if (specificLaptopIndex > -1) {
    let specificLaptop = inventoryRes.serial_numbers[specificLaptopIndex];
    if (specificLaptop.status === "Deployed") {
      specificLaptop.status = type;
      delete specificLaptop.first_name;
      delete specificLaptop.last_name;
      delete specificLaptop.email;
      delete specificLaptop.address;
      delete specificLaptop.phone_number;
      try {
        await inventory.updateDevice(
          deviceId,
          specificLaptop,
          containerId,
          specificLaptopIndex
        );
      } catch (e) {
        res.status(500).send("error updating db");
      }
    }
  }

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

  res.json({ status: "Successful" });
});

export default router;
