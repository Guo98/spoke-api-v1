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
  } = req.body;
  console.log(`/marketplace/add/${client} => Starting function.`);

  try {
    console.log(`/marketplace/add/${client} => Getting all marketplace items.`);
    const marketplace = await inventory.getAll("MarketplaceInventory");
    const formatted_specs = screen_size + ", " + cpu + ", " + ram + ", " + ssd;
    let type_exists = false;
    let new_device = false;

    marketplace.forEach(async (market) => {
      let updated_marketplace = { ...market };
      if (market.client === client) {
        if (type.toLowerCase() === market.item_type.toLowerCase()) {
          console.log(`/marketplace/add/${client} => Matched device type.`);
          type_exists = true;
          // go thru different brands
          let brand_exists = false;
          market.brands.forEach(async (device_brand, brand_index) => {
            if (device_brand.brand === brand) {
              console.log(
                `/marketplace/add/${client} => Matched device brand.`
              );
              // go through different brand lines
              brand_exists = true;
              let line_exists = false;
              device_brand.types.forEach(async (d_t, d_t_index) => {
                if (d_t.type.toLowerCase() === device_line.toLowerCase()) {
                  console.log(
                    `/marketplace/add/${client} => Matched device line.`
                  );
                  line_exists = true;
                  // check specs to makes sure it hasn't been added already
                  let spec_exists = false;
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
                      spec_exists = true;
                      console.log(
                        `/marketplace/add/${client} => Spec already exists.`
                      );
                      res.json({ status: "Already exists" });
                    }
                  });

                  if (!spec_exists) {
                    new_device = true;
                    console.log(`/marketplace/add/${client} => Adding spec`);
                    updated_marketplace.brands[brand_index].types[
                      d_t_index
                    ].specs.push({
                      spec: formatted_specs,
                      locations,
                      supplier: {
                        [supplier.toLowerCase()]: {
                          [color]:
                            supplier.toLowerCase() === "cdw"
                              ? supplier_url
                              : req.body.sku,
                        },
                      },
                    });
                  }
                }
              });

              if (!line_exists) {
                new_device = true;
                console.log(
                  `/marketplace/add/${client} => Adding device line and spec.`
                );
                updated_marketplace.brands[brand_index].types.push({
                  type: device_line,
                  colors: [color],
                  specs: [
                    {
                      spec: formatted_specs,
                      locations,
                      supplier: {
                        [supplier.toLowerCase()]: {
                          [color]:
                            supplier.toLowerCase() === "cdw"
                              ? supplier_url
                              : req.body.sku,
                        },
                      },
                    },
                  ],
                });
              }
            }
          });

          if (!brand_exists) {
            new_device = true;
            console.log(
              `/marketplace/add/${client} => Adding device brand, line and spec.`
            );
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
                        [supplier.toLowerCase()]: {
                          [color]:
                            supplier.toLowerCase() === "cdw"
                              ? supplier_url
                              : req.body.sku,
                        },
                      },
                    },
                  ],
                },
              ],
              imgSrc: req.body.img_src,
            });
          }
        }

        if (new_device) {
          try {
            console.log(
              `/marketplace/add/${client} => Updating database with new device.`
            );
            await inventory.marketplaceUpdateSelections(
              updated_marketplace.id,
              client,
              updated_marketplace
            );
          } catch (err) {
            console.log(
              `/marketplace/add/${client} => Error in updating specs:`,
              err
            );
          }
        }
      }
    });

    if (!type_exists) {
      console.log(
        `/marketplace/add/${client} => Adding new device type, brand, line and spec.`
      );
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
        console.log(`/marketplace/add/${client} => Updating db with new type.`);
        const added_item = await inventory.addItem(
          "MarketplaceInventory",
          new_doc
        );
      } catch (e) {
        console.log(
          `/marketplace/add/${client} => Error in updating db with new type:`,
          e
        );
        res.status(500).json({
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
            t.specs.forEach((s) => {
              if (s.spec === specs) {
                s.bookmarked = true;
              }
            });
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

export default router;
