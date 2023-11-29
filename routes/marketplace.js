import { Router } from "express";

import { scrape_supplier_site } from "../services/scraper/supplier_site.js";
import { checkJwt } from "../services/auth0.js";
import { inventory } from "./inventory.js";

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
    res.json({ status: "Error" });
  }
  console.log("/marketplace/specs => Finished route.");
});

router.post("/marketplace/add", checkJwt, async (req, res) => {
  const { client, type, device_name, brand } = req.body;
  console.log(`/marketplace/add/${client} => Starting function.`);

  try {
    console.log(`/marketplace/add/${client} => Getting all marketpalce items.`);
    const marketplace = await inventory.getAll("MarketplaceInventory");

    marketplace.forEach((market) => {
      if (market.client === client) {
        if (type.toLowerCase() === market.item_type.toLowerCase()) {
          market.forEach((device_brand) => {
            if (device_brand.brand === brand) {
            }
          });
        }
      }
    });
  } catch (e) {
    console.log(
      `/marketplace/add/${client} => Error in getting all marketplace:`,
      e
    );
    res
      .status(500)
      .json({ status: "Error", data: "Error in adding to marketplace" });
  }

  res.send("Hello World");
  console.log(`/marketplace/add/${client} => Finished function.`);
});

export default router;
