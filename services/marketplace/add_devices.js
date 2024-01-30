export async function addNewDevice(
  inventory_db,
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
  sku,
  client,
  device_line,
  item_name
) {
  try {
    const marketplace = await inventory_db.getAll("MarketplaceInventory");
    const formatted_specs =
      type === "phones"
        ? item_name
        : screen_size + ", " + cpu + ", " + ram + ", " + ssd;
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
                    if (type.toLowerCase() !== "phones") {
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
                        return "exists";
                      }
                    } else {
                      if (
                        d_s.spec.toLowerCase() === formatted_specs.toLowerCase()
                      ) {
                        spec_exists = true;
                        console.log(
                          `/marketplace/add/${client} => Spec already exists.`
                        );
                        return "exists";
                      }
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
                              : sku,
                        },
                      },
                    });

                    if (
                      updated_marketplace.brands[brand_index].types[
                        d_t_index
                      ].colors.findIndex(
                        (c) => c.toLowerCase() === color.toLowerCase()
                      ) < 0
                    ) {
                      updated_marketplace.brands[brand_index].types[
                        d_t_index
                      ].colors.push(color);
                    }
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
                      colors: [color],
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
                      colors: [color],
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
            await inventory_db.marketplaceUpdateSelections(
              updated_marketplace.id,
              client,
              updated_marketplace
            );
            return "success";
          } catch (err) {
            console.log(
              `/marketplace/add/${client} => Error in updating specs:`,
              err
            );
            return "error";
          }
        }
      }
    });

    if (!type_exists) {
      console.log(
        `/marketplace/add/${client} => Adding new device type, brand, line and spec.`
      );
      let new_doc = {
        id: type.toLowerCase() + "-" + client.toLowerCase(),
        item_type: type.charAt(0).toUpperCase() + type.slice(1),
        client,
        brands: [
          {
            imgSrc: req.body.img_src,
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
                      [supplier.toLowerCase()]: { [color]: supplier_url },
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
        const added_item = await inventory_db.addItem(
          "MarketplaceInventory",
          new_doc
        );
        return "success";
      } catch (e) {
        console.log(
          `/marketplace/add/${client} => Error in updating db with new type:`,
          e
        );
        return "error";
      }
    }
  } catch (e) {
    return "error";
  }
}
