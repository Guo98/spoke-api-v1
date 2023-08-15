import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../utils/config.js";
import { Inventory } from "../models/inventory.js";
import { checkJwt } from "../services/auth0.js";
import { determineContainer } from "../utils/utility.js";
import inventoryOffboard from "../services/inventory/offboarding.js";
import { exportInventory } from "../services/excel.js";
import deployLaptop from "../services/inventory/deploy.js";
import requestInventory from "../services/inventory/request.js";
import {
  sendNotificationEmail,
  sendOrderConfirmationEmail,
} from "../services/sendEmail.js";
import { resetMockApprovals } from "./orders.js";

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

router.get("/inventory/:company/:entity?", checkJwt, async (req, res) => {
  const company = req.params.company;
  const dbContainer = determineContainer(company);
  console.log(`/getInventory/${company} => Starting route.`);
  if (dbContainer !== "") {
    console.log(
      `/getInventory/${company} => Getting inventory from db: ${dbContainer}.`
    );
    try {
      let inventoryRes = await inventory.getAll(dbContainer);
      // const filteredRes = inventoryRes.filter(
      //   (inv) => inv.location.indexOf("USA") > -1
      // );
      if (req.params.entity) {
        inventoryRes = inventoryRes.filter(
          (inv) => inv.entity === req.params.entity
        );
      }
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
    requestor_email,
    requestor_name,
    first_name,
    last_name,
    device_name,
    shipping,
  } = req.body;
  console.log(`/deployLaptop/${client} => Starting route.`);

  await deployLaptop(res, req.body, inventory);

  console.log(`/deployLaptop/${client} => Ending route.`);

  if (!res.headersSent) res.send({ status: "Success" });

  try {
    console.log(`/deployLaptop/${client} => Starting notification email.`);
    await sendNotificationEmail();
    console.log(
      `/deployLaptop/${client} => Successfully sent notification email.`
    );
  } catch (e) {
    console.log(
      `/deployLaptop/${client} => Error in sending notification email:`,
      e
    );
  }

  try {
    console.log(
      `/deployLaptop/${client} => Starting order confirmation email.`
    );
    await sendOrderConfirmationEmail(
      requestor_email,
      requestor_name,
      "Deployment",
      first_name + " " + last_name,
      device_name,
      shipping
    );
    console.log(
      `/deployLaptop/${client} => Successfully sent order confirmation email.`
    );
  } catch (e) {
    console.log(
      `/deployLaptop/${client} => Error in sending order confirmation email:`,
      e
    );
  }
});

router.post("/offboarding", checkJwt, async (req, res) => {
  const { client, recipient_name, requestor_email, requestor_name, type } =
    req.body;
  console.log(`/offboarding/${client} => Starting route.`);

  await inventoryOffboard(res, req.body, inventory);

  console.log(`/offboarding/${client} => Ending route.`);
  if (!res.headersSent) res.send({ status: "Success" });

  try {
    console.log(`/offboarding/${client} => Starting order confirmation email.`);
    await sendOrderConfirmationEmail(
      requestor_email,
      requestor_name,
      type,
      recipient_name,
      "",
      "Standard"
    );
    console.log(
      `/offboarding/${client} => Successfully sent order confirmation email.`
    );
  } catch (e) {
    console.log(
      `/offboarding/${client} => Error in sending order confirmation email:`,
      e
    );
  }
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
  const { client } = req.body;
  console.log(`/requestInventory/${client} => Starting route.`);

  await requestInventory(res, req.body, inventory);

  console.log(`/requestInventory/${client} => Ending route.`);
  if (!res.headersSent) res.json({ status: "Successful" });
});

router.get("/resetdata", checkJwt, async (req, res) => {
  console.log("/resetdata => Starting route.");
  const resetSN = [
    "XO3KUPTPCP4L",
    "L6PNGBPWRLSE",
    "YVWGL4PSGQX4",
    "R2LNMFJ",
    "248QKCY",
    "2FU9BYDBT985",
  ];
  try {
    console.log(`/resetdata => Getting all inventory to reset.`);
    const inventoryRes = await inventory.getAll("Mock");
    for (let i = 0; i < inventoryRes.length; i++) {
      let changed = false;
      if (inventoryRes[i].serial_numbers.length > 0) {
        for (let j = 0; j < inventoryRes[i].serial_numbers.length; j++) {
          if (resetSN.indexOf(inventoryRes[i].serial_numbers[j].sn) > -1) {
            changed = true;
            inventoryRes[i].serial_numbers[j] = resetDevice(
              inventoryRes[i].serial_numbers[j]
            );
          }
        }
      }

      if (changed) {
        try {
          console.log(`/resetdata => Resetting laptop: ${inventoryRes[i].id}`);
          const updateRes = await inventory.updateLaptop(
            "Mock",
            inventoryRes[i].id,
            inventoryRes[i]
          );
        } catch (err) {
          console.log(
            `/resetdata => Error in resetting laptop: ${inventoryRes[i].id}. Error: ${err}`
          );
        }
      }
    }
  } catch (e) {
    console.log(
      `/resetdata => Error getting all inventory to reset. Error: ${e}`
    );
  }

  try {
    console.log(`/resetdata => Getting approvals to reset.`);
    await resetMockApprovals();
  } catch (e) {
    console.log(`/resetdata => Error in reseting approvals:`, e);
  }
  console.log("/resetdata => Ending route.");
  res.json({ status: "Success" });
});

router.get(
  "/downloadinventory/:client/:entity?",
  checkJwt,
  async (req, res) => {
    let containerId = determineContainer(req.params.client);
    console.log(`/downloadinventory/${req.params.client} => Starting route.`);
    try {
      console.log(
        `/downloadinventory/${
          req.params.client
        } => Getting all inventory. Entity: ${
          req.params.entity ? req.params.entity : ""
        }`
      );
      const inventoryRes = await inventory.getAll(containerId);

      let allDevices = [];

      inventoryRes.forEach((device) => {
        if (req.params.entity) {
          if (req.params.entity === device.entity) {
            device.serial_numbers.forEach((item) => {
              allDevices.push({
                ...item,
                name: device.name,
                location: device.location,
                grade: item.grade ? item.grade : "",
              });
            });
          }
        } else {
          device.serial_numbers.forEach((item) => {
            allDevices.push({
              ...item,
              name: device.name,
              location: device.location,
              grade: item.grade ? item.grade : "",
            });
          });
        }
      });
      console.log(
        `/downloadinventory/${req.params.client} => Got list of of devices.`
      );

      await exportInventory(res, allDevices);
    } catch (e) {
      res.status(500).send({ status: "Error in here" });
    }
    // res.send("Hello World!");
    console.log(`/downloadinventory/${req.params.client} => Ending route.`);
  }
);

// add to stock
router.post("/addtostock", checkJwt, async (req, res) => {
  const {
    client,
    device_name,
    device_location,
    status,
    date_requested,
    serial_numbers,
    id,
  } = req.body;
  const containerId = determineContainer(client);
  console.log(`/addtostock/${client} => Starting route.`);
  if (containerId !== "") {
    const deviceId = id;
    if (deviceId) {
      try {
        console.log(
          `/addtostock/${client} => Getting device info for ${device_name}`
        );
        const laptopRes = await inventory.getItem(containerId, deviceId);
        console.log(
          `/addtostock/${client} => Finished getting device info for ${device_name}`
        );
        const replaceIndex = laptopRes.serial_numbers.findIndex(
          (laptop) =>
            laptop.status === "In Progress" &&
            laptop.sn === status &&
            laptop.date_requested === date_requested &&
            laptop.quantity === serial_numbers.length
        );

        if (replaceIndex > -1) {
          laptopRes.serial_numbers.splice(replaceIndex, 1);
        }

        serial_numbers.forEach((newDevice) => {
          laptopRes.serial_numbers.push({
            status: "In Stock",
            condition: "New",
            sn: newDevice,
          });
        });

        if (laptopRes.new_device) {
          laptopRes.new_device = false;
          laptopRes.specs = req.body.specs;
        }
        try {
          console.log(
            `/addtostock/${client} => Adding stock to laptop: ${device_name}`
          );
          const replaceRes = await inventory.updateLaptop(
            containerId,
            deviceId,
            laptopRes
          );
          console.log(
            `/addtostock/${client} => Finish adding stock to laptop: ${device_name}`
          );
        } catch (e) {
          console.log(
            `/addtostock/${client} => Error updating stock of laptop ${device_name}. Error: ${e}`
          );
          res.status(500).json({ status: "Error adding stock" });
        }
      } catch (e) {
        console.log(
          `/addtostock/${client} => Error getting document for device: ${device_name}`
        );
        res.status(500).json({ status: "Error getting device" });
      }
    } else {
      console.log(
        `/addtostock/${client} => No matching device id found for ${device_name}`
      );
      res.status(500).json({ status: "Error getting device id" });
    }
  } else {
    console.log(`/addtostock/${client} => Couldn't find container for client.`);
    res.status(500).json({ status: "Error no conatiner" });
  }
  console.log(`/addtostock/${client} => Ending route.`);
  if (!res.headersSent) res.json({ status: "Success" });
});

router.get("/getmarketplaceinventory/:client", checkJwt, async (req, res) => {
  const dbContainer = determineContainer("MarketplaceInventory");
  const client = req.params.client;

  console.log(`/getmarketplaceinventory/${client} => Starting route.`);

  console.log(
    `/getmarketplaceinventory/${client} => Getting marketplace inventory.`
  );

  try {
    let inventoryRes = await inventory.getAll(dbContainer);

    inventoryRes = inventoryRes.filter((inv) => inv.client === client);

    inventoryRes.forEach((device) => {
      delete device._rid;
      delete device._self;
      delete device._etag;
      delete device._attachments;
      delete device._ts;
      device.brands.push({
        brand: "Others",
        types: [],
        imgSrc:
          "https://spokeimages.blob.core.windows.net/image/defaultlaptop.jpeg",
      });
    });
    console.log(
      `/getmarketplaceinventory/${client} => Ending route. Successful.`
    );
    res.json({ status: "Successful", data: inventoryRes });
  } catch (e) {
    console.log(`/getmarketplaceinventory/${client} => Error: `, e);
    res.status(500).json({ status: "Error", data: [] });
  }
});

/**
 * @param {string} client
 * @param {string} device_id
 * @param {string} serial_number
 * @param {string} updated_sn
 * @param {string} updated_fn
 * @param {string} updated_ln
 * @param {string} updated_status
 * @param {string} device_index
 */
// updateInventory
router.patch("/inventory", checkJwt, async (req, res) => {
  const {
    client,
    device_id,
    serial_number,
    device_index,
    updated_sn,
    updated_fn,
    updated_ln,
    updated_status,
    grade,
    updated_condition,
    updated_warehouse,
  } = req.body;
  console.log(`[PATCH] /inventory/${client} => Starting route.`);

  try {
    console.log(`[PATCH] /inventory/${client} => Starting update function.`);
    const updateResp = await inventory.opsUpdateInventory(
      client,
      device_index,
      device_id,
      serial_number,
      updated_status,
      updated_sn,
      updated_fn,
      updated_ln,
      grade,
      updated_condition,
      updated_warehouse
    );
    if (updateResp === "Error") {
      throw new Error("Error in updating");
    } else {
      res.json({ status: "Successful", data: updateResp });
    }
    console.log(
      `[PATCH] /inventory/${client} => Finished updating db function.`
    );
  } catch (e) {
    console.log(`[PATCH] /inventory/${client} => Error in updating:`, e);
    res.status(500).json({ status: "Error" });
  }

  if (!res.headersSent) res.json({ status: "Nothing happened" });
  console.log(`[PATCH] /inventory/${client} => Finished route.`);
});

// addInventory
router.put("/inventory", checkJwt, async (req, res) => {
  const { client, device_id, new_devices } = req.body;
  console.log(`[PUT] /inventory/${client} => Starting route.`);
  try {
    console.log(`[PUT] /inventory/${client} => Starting updating db function.`);
    const addResp = await inventory.opsAddInventory(
      client,
      device_id,
      new_devices
    );
    console.log(`[PUT] /inventory/${client} => Finished updating db function.`);
    res.json({ status: "Successful", data: addResp });
  } catch (e) {
    console.log(`[PUT] /inventory/${client} => Error in updating:`, e);
    res.status(500).json({ status: "Error" });
  }
  if (!res.headersSent) res.json({ status: "Nothing happened" });
  console.log(`[PUT] /inventory/${client} => Finished route.`);
});

router.delete(
  "/inventory/:client/:device_id/:device_index/:serial_number",
  checkJwt,
  async (req, res) => {
    const { client, device_id, device_index, serial_number } = req.params;
    console.log(`[DELETE] /inventory/${client} => Starting route.`);
    try {
      console.log(`/deleteinventory/${client} => Starting delete function.`);
      const deleteResp = await inventory.opsDeleteInventory(
        client,
        device_id,
        device_index,
        serial_number
      );

      if (deleteResp === "Error") {
        throw new Error("Serial number not found");
      } else {
        res.json({ status: "Successful", data: deleteResp });
      }
      console.log(
        `[DELETE] /inventory/${client} => Finished deleting ${serial_number} from ${device_id}.`
      );
    } catch (e) {
      console.log(
        `[DELETE] /inventory/${client} => Error in deleting ${serial_number} from ${device_id}:`,
        e
      );
      res.status(500).json({ status: "Error" });
    }
    console.log(`[DELETE] /inventory/${client} => Finished route.`);
  }
);

router.post("/inventory", checkJwt, async (req, res) => {
  const { client, device, location, screen, cpu, ram, ssd, entity, sku } =
    req.body;
  console.log(`[POST] /inventory/${client} => Starting function.`);
  try {
    console.log(`[POST] /inventory/${client} => Updating db.`);
    const newItem = {
      name: device,
      location,
      specs: {
        screen_size: screen,
        ram,
        cpu,
        hard_drive: ssd,
      },
      serial_numbers: [],
      entity,
      sku,
      image_source:
        "https://spokeimages.blob.core.windows.net/image/defaultlaptop.jpeg",
    };
    await inventory.opsAddNewDevice(client, newItem);
    res.json({ status: "Success" });
    console.log(`[POST] /inventory/${client} => Finished updating db.`);
  } catch (e) {
    console.log(
      `[POST] /inventory/${client} => Error in adding item to db:`,
      e
    );
    res.status(500).json({ status: "Error" });
  }

  console.log(`[POST] /inventory/${client} => Finished function.`);
});

router.patch("/marketplace", checkJwt, async (req, res) => {
  const { client } = req.body;
  console.log(`[PATCH] /marketplace/${client} => Starting route.`);
  try {
    console.log(`[PATCH] /marketplace/${client} => Starting update function.`);
    const result = await inventory.opsUpdateMarketplace(req.body);
    console.log(`[PATCH] /marketplace/${client} => Finished update function.`);
    res.json({ status: "Successful", data: result });
  } catch (e) {
    console.log(
      `[PATCH] /marketplace/${client} => Error in updating marketplace inventory:`,
      e
    );
    res.status(500).json({ status: "Error" });
  }
  console.log(`[PATCH] /marketplace/${client} => Finished route.`);
});

router.post("/inventory/csv", async (req, res) => {
  res.send("Hello World");
});

function resetDevice(item) {
  let resetItem = {
    sn: item.sn,
    status: "In Stock",
    condition: item.condition,
  };
  if (item.grade) {
    resetItem.grade = item.grade;
  }
  return resetItem;
}

async function addNewSerialNumber(client, device_id, new_device) {
  try {
    await inventory.opsAddInventory(client, device_id, [new_device]);
  } catch (e) {
    console.log(
      `addNewSerialNumber(${client}) => Error in adding new serial number: ${JSON.stringify(
        new_device
      )}. Error: `,
      e
    );
  }
}

async function getAllInventory(client) {
  const allInventory = await inventory.getAll(client);
  return allInventory;
}

async function createInventoryContainer(client) {
  const newCoResponse = await inventory.newContainer(client);
  return newCoResponse;
}

export default router;

export { addNewSerialNumber, getAllInventory, createInventoryContainer };
