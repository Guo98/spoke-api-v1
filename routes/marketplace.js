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
  const { update_type, client, type, id, brand, device_type } = req.body;
  res.send("Hello World");
});

export default router;
