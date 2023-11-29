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
  } = req.body;
  console.log(`/marketplace/add/${client} => Starting function.`);

  try {
    console.log(`/marketplace/add/${client} => Getting all marketpalce items.`);
    const marketplace = await inventory.getAll("MarketplaceInventory");

    marketplace.forEach((market) => {
      if (market.client === client) {
        if (type.toLowerCase() === market.item_type.toLowerCase()) {
          // go thru different brands
          market.forEach((device_brand, brand_index) => {
            if (device_brand.brand === brand) {
              // go through different brand lines
              device_brand.types.forEach((d_t, d_t_index) => {
                if (d_t.type.toLowerCase() === device_line.toLowerCase()) {
                  // check specs to makes sure it hasn't been added already
                  d_t.specs.forEach((d_s) => {
                    const no_spaces_spec = d_s.spec
                      .replace(" ", "")
                      .toLowerCase();
                    if (
                      no_spaces_spec.includes(screen_size) &&
                      no_spaces_spec.includes(cpu.toLowerCase()) &&
                      no_spaces_spec.includes(ram.toLowerCase()) &&
                      no_spaces_spec.includes(ssd.toLowerCase())
                    ) {
                      console.log(
                        `/marketplace/add/${client} => Spec already exists.`
                      );
                      res.json({ status: "Already exists" });
                    } else {
                      let updated_marketplace = { ...market };
                      updated_marketplace.brands[brand_index].types[
                        d_t_index
                      ].specs.push({
                        spec:
                          screen_size + ", " + cpu + ", " + ram + ", " + ssd,
                        locations: [],
                        supplier: {
                          cdw: { [color]: supplier_url },
                        },
                      });
                    }
                  });
                }
              });
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
