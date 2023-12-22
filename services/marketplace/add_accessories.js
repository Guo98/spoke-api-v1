export async function addNewAccessory(
  inventory_db,
  client,
  item_name,
  supplier_url,
  brand,
  supplier,
  locations
) {
  try {
    const marketplace = await inventory_db.getAll("MarketplaceInventory");

    let item_type_exists = false;
    marketplace.forEach(async (market) => {
      if (
        market.client === client &&
        market.item_type.toLowerCase() === "accessories"
      ) {
        item_type_exists = true;
        let item_exists = false;
        market.items.forEach((item) => {
          if (item.name.toLowerCase() === item_name.toLowerCase()) {
            item_exists = true;
          }
        });

        if (!item_exists) {
          let updated_marketplace = { ...market };
          updated_marketplace.items.push({
            name: item_name,
            brand,
            supplier: {
              [supplier.toLowerCase()]: supplier_url,
            },
            locations,
          });

          const updt_item = await inventory_db.marketplaceUpdateSelections(
            updated_marketplace.id,
            client,
            updated_marketplace
          );
        }
      }
    });

    if (!item_type_exists) {
      let new_doc = {
        id: "accessories-" + client.toLowerCase(),
        item_type: "Accessories",
        client,
        items: [
          {
            name: item_name,
            brand,
            supplier: {
              [supplier.toLowerCase()]: supplier_url,
            },
            locations,
          },
        ],
        imgSrc: "https://spokeimages.blob.core.windows.net/image/charger.jpeg",
      };
      const added_item = await inventory_db.addItem(
        "MarketplaceInventory",
        new_doc
      );
    }

    return "success";
  } catch (e) {
    return "error";
  }
}
