import { Router } from "express";

import { scrape_supplier_site } from "../services/scraper/supplier_site.js";
import { checkJwt } from "../services/auth0.js";
import { inventory } from "./inventory.js";
import { addNewDevice } from "../services/marketplace/add_devices.js";
import { addNewAccessory } from "../services/marketplace/add_accessories.js";

const router = Router();

router.post("/marketplace/specs", checkJwt, async (req, res) => {
  console.log("/marketplace/specs => Starting route.");
  const { supplier_url } = req.body;
  try {
    const device_info = await scrape_supplier_site(supplier_url);

    if (device_info !== null) {
      res.json({ status: "Successful", data: device_info });
    } else {
      res.json({ status: "Could not retrieve info" });
    }
  } catch (e) {
    console.log("/marketplace/specs => Error:", e);
    res.json({ status: "Error" });
  }
  console.log("/marketplace/specs => Finished route.");
});

router.post("/marketplace/add", checkJwt, async (req, res) => {
  const {
    client,
    type,
    device_name,
    brand,
    device_line,
    screen_size,
    cpu,
    ram,
    ssd,
    supplier_url,
    color,
    locations,
    supplier,
    item_name,
  } = req.body;
  console.log(`/marketplace/add/${client} => Starting function.`);

  if (type.toLowerCase() === "laptops" || type.toLowerCase() === "desktops") {
    const add_result = await addNewDevice(
      inventory,
      screen_size,
      cpu,
      ram,
      ssd,
      type,
      brand,
      color,
      locations,
      supplier,
      supplier_url,
      req.body.sku,
      client,
      device_line
    );

    if (add_result === "error") {
      res.status(500).json({ status: "Error in adding new device" });
    }
  } else if (type.toLowerCase() === "accessories") {
    const add_result = await addNewAccessory(
      inventory,
      client,
      item_name,
      supplier_url,
      brand,
      supplier,
      locations
    );
    if (add_result === "error") {
      res.status(500).json({ status: "Error in adding new accessory" });
    }
  }

  if (!res.headersSent) res.json({ status: "Successful" });

  console.log(`/marketplace/add/${client} => Finished function.`);
});

router.post("/marketplace/bookmark", checkJwt, async (req, res) => {
  const { client, brand, type, specs, product_type } = req.body;

  const db_id = product_type.toLowerCase() + "-" + client.toLowerCase();

  try {
    let marketplace = await inventory.getItemWKey(
      "MarketplaceInventory",
      db_id,
      client
    );

    marketplace.brands.forEach((b) => {
      if (b.brand === brand) {
        b.types.forEach((t) => {
          if (t.type === type) {
            const spec_index = t.specs.findIndex((s) => s.spec === specs);
            if (spec_index !== -1) {
              t.specs[spec_index].bookmarked = true;
            }
          }
        });
      }
    });

    const replaced = await inventory.updateItemWKey(
      "MarketplaceInventory",
      db_id,
      client,
      marketplace
    );

    res.json({ status: "Successful" });
  } catch (e) {
    console.log(`/marketplace/bookmark => Error in getting item ${db_id}:`, e);
    res.status(500).json({ status: "Error" });
  }

  if (!res.headersSent) res.json({ status: "Nothing happened" });
});

router.post("/marketplace/bookmark/delete", checkJwt, async (req, res) => {
  const { client, brand, type, specs, product_type } = req.body;

  const db_id = product_type.toLowerCase() + "-" + client.toLowerCase();

  try {
    let marketplace = await inventory.getItemWKey(
      "MarketplaceInventory",
      db_id,
      client
    );

    marketplace.brands.forEach((b) => {
      if (b.brand === brand) {
        b.types.forEach((t) => {
          if (t.type === type) {
            const spec_index = t.specs.findIndex((s) => s.spec === specs);
            if (spec_index !== -1) {
              delete t.specs[spec_index].bookmarked;
            }
          }
        });
      }
    });

    const replaced = await inventory.updateItemWKey(
      "MarketplaceInventory",
      db_id,
      client,
      marketplace
    );

    res.json({ status: "Successful" });
  } catch (e) {
    console.log(`/marketplace/bookmark => Error in getting item ${db_id}:`, e);
    res.status(500).json({ status: "Error" });
  }

  if (!res.headersSent) res.json({ status: "Nothing happened" });
});

router.post("/marketplace/delete", checkJwt, async (req, res) => {
  const { client, brand, type, specs, product_type } = req.body;
  console.log(`/marketplace/delete/${client} => Starting route.`);
  const db_id = product_type.toLowerCase() + "-" + client.toLowerCase();

  try {
    let marketplace = await inventory.getItemWKey(
      "MarketplaceInventory",
      db_id,
      client
    );
    let remove_brand_index = -1;
    marketplace.brands.forEach((b, b_index) => {
      if (b.brand === brand) {
        let remove_type_index = -1;
        b.types.forEach((t, t_index) => {
          if (t.type === type) {
            const spec_index = t.specs.findIndex((s) => s.spec === specs);
            if (spec_index !== -1) {
              t.specs.splice(spec_index, 1);
            }

            if (t.specs.length === 0) {
              remove_type_index = t_index;
            }
          }
        });

        if (remove_type_index > -1) {
          b.types.splice(remove_type_index, 1);
        }

        if (b.types.length === 0) {
          remove_brand_index = b_index;
        }
      }
    });

    if (remove_brand_index > -1) {
      marketplace.brands.splice(remove_brand_index, 1);
    }

    const replaced = await inventory.updateItemWKey(
      "MarketplaceInventory",
      db_id,
      client,
      marketplace
    );

    res.json({ status: "Successful" });
  } catch (e) {
    console.log(`/marketplace/bookmark => Error in getting item ${db_id}:`, e);
    res.status(500).json({ status: "Error" });
  }
  console.log(`/marketplace/delete/${client} => Finished route.`);
  if (!res.headersSent) res.json({ status: "Nothing happened" });
});

router.post("/marketplace/delete/accessories", async (req, res) => {
  const { client, items } = req.body;
  console.log(`/marketplace/delete/accessories/${client} => Starting route.`);
  const db_id = "accessories-" + client.toLowerCase();
  try {
    let marketplace = await inventory.getItemWKey(
      "MarketplaceInventory",
      db_id,
      client
    );

    items.forEach((item) => {
      const item_index = marketplace.items.findIndex((i) =>
        item.toLowerCase().includes(i.name.toLowerCase())
      );

      if (item_index > -1) {
        marketplace.items.splice(item_index, 1);
      }
    });

    const replaced = await inventory.updateItemWKey(
      "MarketplaceInventory",
      db_id,
      client,
      marketplace
    );

    res.json({ status: "Successful" });
  } catch (e) {
    console.log(
      `/marketplace/delete/accessories/${client} => Error in deleting items ${db_id}:`,
      e
    );
    res.status(500).json({ status: "Error" });
  }
  console.log(`/marketplace/delete/accessories/${client} => Finished route.`);
  if (!res.headersSent) res.json({ status: "Nothing happened" });
});

export default router;
