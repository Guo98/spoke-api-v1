import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../utils/config.js";
import { Inventory } from "../models/inventory.js";
import { checkJwt } from "../services/auth0.js";
import { inventoryDBMapping } from "../utils/mappings/inventory.js";
import { validateAddress } from "../services/address.js";

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

  // console.log("specific laptop :::::::::: ", specificLaptop);
  res.send("Success");
});

const determineContainer = (client) => {
  switch (client) {
    case "public":
      return "Mock";
    default:
      return "";
  }
};

export default router;
