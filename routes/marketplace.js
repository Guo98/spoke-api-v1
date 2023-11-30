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
    locations,
  } = req.body;
  console.log(`/marketplace/add/${client} => Starting function.`);

  try {
    console.log(`/marketplace/add/${client} => Getting all marketplace items.`);
    const marketplace = await inventory.getAll("MarketplaceInventory");
    const formatted_specs = screen_size + ", " + cpu + ", " + ram + ", " + ssd;
    let type_exists = false;
    marketplace.forEach(async (market) => {
      let updated_marketplace = { ...market };
      if (market.client === client) {
        if (type.toLowerCase() === market.item_type.toLowerCase()) {
          type_exists = true;
          // go thru different brands
          let brand_exists = false;
          market.forEach(async (device_brand, brand_index) => {
            if (device_brand.brand === brand) {
              // go through different brand lines
              brand_exists = true;
              let line_exists = false;
              device_brand.types.forEach(async (d_t, d_t_index) => {
                if (d_t.type.toLowerCase() === device_line.toLowerCase()) {
                  line_exists = true;
                  // check specs to makes sure it hasn't been added already
                  d_t.specs.forEach(async (d_s) => {
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
                      updated_marketplace.brands[brand_index].types[
                        d_t_index
                      ].specs.push({
                        spec: formatted_specs,
                        locations,
                        supplier: {
                          cdw: { [color]: supplier_url },
                        },
                      });
                    }
                  });
                }
              });

              if (!line_exists) {
                updated_marketplace.brands[brand_index].types.push({
                  type: device_line,
                  colors: [color],
                  specs: [
                    {
                      spec: formatted_specs,
                      locations,
                      supplier: {
                        cdw: { [color]: supplier_url },
                      },
                    },
                  ],
                });
              }
            }
          });

          if (!brand_exists) {
            updated_marketplace.brands.push({
              brand,
              types: [
                {
                  type: device_line,
                  colors: [color],
                  specs: [
                    {
                      spec: formatted_specs,
                      locations,
                      supplier: {
                        cdw: { [color]: supplier_url },
                      },
                    },
                  ],
                },
              ],
            });
          }
        }

        if (JSON.stringify(market) !== JSON.stringify(updated_marketplace)) {
          try {
            await inventory.marketplaceUpdateSelections(
              updated_marketplace.id,
              client,
              updated_marketplace
            );
          } catch (err) {
            console.log(
              `/marketplace/add/${client} => Error in updating specs.`
            );
          }
        }
      }
    });

    if (!type_exists) {
      const new_doc = {
        id: type.toLowerCase() + "-" + client.toLowerCase(),
        item_type: type,
        client,
        brands: [
          {
            brand,
            types: [
              {
                type: device_line,
                colors: [color],
                specs: [
                  {
                    spec: formatted_specs,
                    locations,
                    supplier: {
                      cdw: { [color]: supplier_url },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      try {
        const added_item = await inventory.addItem(
          "MarketplaceInventory",
          new_doc
        );
      } catch (e) {
        res
          .status(500)
          .json({
            status: "Error",
            data: "Error in adding new type to marketplace",
          });
      }
    }
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