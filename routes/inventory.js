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
import { inventoryDBMapping } from "../utils/mappings/inventory.js";
import {
  sendNotificationEmail,
  sendOrderConfirmationEmail,
} from "../services/sendEmail.js";

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
      // const filteredRes = inventoryRes.filter(
      //   (inv) => inv.location.indexOf("USA") > -1
      // );
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
  const { client, recipient_name, requestor_email, requestor_name } = req.body;
  console.log(`/offboarding/${client} => Starting route.`);

  await inventoryOffboard(res, req.body, inventory);

  console.log(`/offboarding/${client} => Ending route.`);
  if (!res.headersSent) res.send({ status: "Success" });

  try {
    console.log(`/offboarding/${client} => Starting order confirmation email.`);
    await sendOrderConfirmationEmail(
      requestor_email,
      requestor_name,
      "Offboarding",
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
  } = req.body;
  const containerId = determineContainer(client);
  console.log(`/addtostock/${client} => Starting route.`);
  if (containerId !== "") {
    const deviceId = inventoryDBMapping[device_name]?.[device_location];
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

// router.get("/testingroute", async (req, res) => {
//   await sendOrderConfirmationEmail(
//     "username99",
//     "deployment",
//     "Andy Guo",
//     "macbook air m2",
//     "overnight"
//   );
//   res.json({ status: "Successful" });
// });

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

export default router;
