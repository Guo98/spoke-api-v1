const partitionKey = undefined;

class Inventory {
  constructor(cosmosClient, databaseId, containerId) {
    this.client = cosmosClient;
    this.databaseId = databaseId;
    this.collectionId = containerId;

    this.database = null;
    this.container = null;
  }

  async init() {
    const dbResponse = await this.client.databases.createIfNotExists({
      id: this.databaseId,
    });

    this.database = dbResponse.database;

    const coResponse = await this.database.containers.createIfNotExists({
      id: this.collectionId,
    });
    this.container = coResponse.container;
  }

  async newContainer(client) {
    const newCoResponse = await this.database.containers.createIfNotExists({
      id: client,
      partitionKey: "/id",
    });
    return newCoResponse;
  }

  async find(querySpec) {
    if (!this.container) {
      throw new Error("Collection is not initialized.");
    }

    const { resources } = await this.container.items
      .query(querySpec)
      .fetchAll();
    return resources;
  }

  async addItem(containerId, item) {
    const coResponse = await this.database.container(containerId).read();
    // item.completed = false;
    const { resource: doc } = await coResponse.container.items.create(item);
    return doc;
  }

  async updateLaptopInventory(containerId, deviceId, type, topupNum) {
    const coResponse = await this.database.container(containerId).read();

    const { resource } = await coResponse.container
      .item(deviceId, deviceId)
      .read();

    resource.serial_numbers.push({
      sn: type,
      status: "In Progress",
      quantity: topupNum,
      date_requested: new Date().toLocaleDateString("en-US"),
    });

    const { resource: replaced } = await coResponse.container
      .item(deviceId, deviceId)
      .replace(resource);

    return replaced;
  }

  async updateLaptop(containerId, deviceId, newDevice) {
    const coResponse = await this.database.container(containerId).read();
    const { resource: replaced } = await coResponse.container
      .item(deviceId, deviceId)
      .replace(newDevice);

    return replaced;
  }

  async updateDevice(deviceId, device, containerId, deviceIndex) {
    const coResponse = await this.database.container(containerId).read();
    const { resource } = await coResponse.container
      .item(deviceId, deviceId)
      .read();

    resource.serial_numbers[deviceIndex] = device;

    const { resource: replaced } = await coResponse.container
      .item(deviceId, deviceId)
      .replace(resource);

    return replaced;
  }

  async getAll(containerId) {
    const coResponse = await this.database.container(containerId).read();
    const { resources: receivedList } = await coResponse.container.items
      .readAll()
      .fetchAll();
    return receivedList;
  }

  async getItem(containerId, itemId) {
    const coResponse = await this.database.container(containerId).read();
    const { resource } = await coResponse.container.item(itemId, itemId).read();

    return resource;
  }

  async opsUpdateInventory(
    containerId,
    device_index,
    device_id,
    serial_number,
    updated_status = "",
    updated_sn = "",
    updated_fn = "",
    updated_ln = "",
    grade = "",
    updated_condition = "",
    updated_warehouse = "",
    updated_date = "",
    updated_supplier = "",
    updated_price = "",
    updated_purchase_date = ""
  ) {
    let verified_index = device_index;
    const coResponse = await this.database
      .container(containerId === "public" ? "Mock" : containerId)
      .read();

    const { resource } = await coResponse.container
      .item(device_id, device_id)
      .read();

    if (serial_number !== resource.serial_numbers[device_index].sn) {
      verified_index = resource.serial_numbers.findIndex(
        (dev) => dev.sn === serial_number
      );
    }

    if (verified_index > -1) {
      if (updated_status !== "") {
        if (updated_status === "In Stock") {
          resource.serial_numbers[verified_index] = {
            sn: resource.serial_numbers[verified_index].sn,
            condition: "Used",
            status: "In Stock",
            grade: grade !== "" ? grade.toUpperCase() : "",
          };
        }
        resource.serial_numbers[verified_index].status = updated_status;
      }
      if (updated_sn !== "") {
        resource.serial_numbers[verified_index].sn = updated_sn;
      }
      if (updated_fn !== "") {
        resource.serial_numbers[verified_index].first_name = updated_fn;
      }
      if (updated_ln !== "") {
        resource.serial_numbers[verified_index].last_name = updated_ln;
      }
      if (updated_condition !== "") {
        resource.serial_numbers[verified_index].condition = updated_condition;
        if (updated_condition === "End of Life") {
          resource.serial_numbers[verified_index].eol_date =
            new Date().toLocaleDateString("en-US");
        }
      }
      if (grade !== "") {
        resource.serial_numbers[verified_index].grade = grade;
      }
      if (updated_warehouse !== "") {
        resource.serial_numbers[verified_index].warehouse = updated_warehouse;
      }
      if (updated_date !== "") {
        resource.serial_numbers[verified_index].date_deployed = updated_date;
      }
      if (updated_supplier !== "") {
        resource.serial_numbers[verified_index].supplier = updated_supplier;
      }
      if (updated_price !== "") {
        resource.serial_numbers[verified_index].price = updated_price;
      }
      if (updated_purchase_date !== "") {
        resource.serial_numbers[verified_index].purchase_date =
          updated_purchase_date;
      }

      const { resource: replaced } = await coResponse.container
        .item(device_id, device_id)
        .replace(resource);

      return replaced;
    } else {
      return "Error";
    }
  }

  async opsAddInventory(containerId, device_id, new_devices) {
    const coResponse = await this.database
      .container(containerId === "public" ? "Mock" : containerId)
      .read();

    const { resource } = await coResponse.container
      .item(device_id, device_id)
      .read();

    resource.serial_numbers = [...resource.serial_numbers, ...new_devices];

    const { resource: replaced } = await coResponse.container
      .item(device_id, device_id)
      .replace(resource);

    return replaced;
  }

  async autoAddInventory(containerId, cdw_part_no, new_devices) {
    console.log(`autoAddInventory(${containerId}) => Starting function.`);
    const coResponse = await this.database.container(containerId).read();
    const { resources: receivedList } = await coResponse.container.items
      .readAll()
      .fetchAll();
    let id = "";
    receivedList.forEach((device) => {
      // const lc_name = device_name.toLowerCase();
      console.log(
        `autoAddInventory(${containerId}) => Searching for device by cdw part number:`,
        cdw_part_no
      );
      if (device.cdw_part_no && device.cdw_part_no === cdw_part_no) {
        console.log(
          `autoAddInventory(${containerId}) => Found device:`,
          device.id
        );
        id = device.id;
      }
    });
    if (id !== "") {
      const { resource } = await coResponse.container.item(id, id).read();
      resource.serial_numbers = [...resource.serial_numbers, ...new_devices];

      const { resource: replaced } = await coResponse.container
        .item(id, id)
        .replace(resource);

      return replaced;
    } else {
      console.log(
        "autoAddInventory() => Could not match device by cdw part number:",
        cdw_part_no
      );
      return undefined;
    }
  }

  async opsDeleteInventory(
    containerId,
    device_id,
    device_index,
    serial_number
  ) {
    let verified_index = device_index;
    const coResponse = await this.database
      .container(containerId === "public" ? "Mock" : containerId)
      .read();

    const { resource } = await coResponse.container
      .item(device_id, device_id)
      .read();

    if (serial_number !== resource.serial_numbers[device_index].sn) {
      verified_index = resource.serial_numbers.findIndex(
        (dev) => dev.sn === serial_number
      );
    }

    if (verified_index > -1) {
      resource.serial_numbers.splice(verified_index, 1);
      const { resource: replaced } = await coResponse.container
        .item(device_id, device_id)
        .replace(resource);
      return replaced;
    } else {
      return "Error";
    }
  }

  async opsAddNewDevice(client, obj) {
    const coResponse = await this.database
      .container(client === "public" ? "Mock" : client)
      .read();

    const { resource: doc } = await coResponse.container.items.create(obj);
    return doc;
  }

  async opsUpdateMarketplace(body) {
    const { update_type, client, type, id } = body;

    const marketplaceContainer = await this.database
      .container("MarketplaceInventory")
      .read();

    // const id =
    //   type.toLowerCase() + "-" + client.replace(/\s+/g, "-").toLowerCase();
    if (!update_type.includes("new")) {
      const { resource } = await marketplaceContainer.container
        .item(id, client)
        .read();
      if (update_type.includes("brand")) {
        const { brand } = body;
        if (update_type === "addbrand") {
          resource.brands.push({
            brand,
            types: [],
            imgSrc:
              "https://spokeimages.blob.core.windows.net/image/defaultlaptop.jpeg",
          });
        } else if (update_type === "deletebrand") {
          const brandIndex = resource.brands.findIndex(
            (b) => b.brand === brand
          );
          resource.brands.splice(brandIndex, 1);
        }
      } else if (update_type.includes("type")) {
        const { device_type, brand } = body;
        const brandIndex = resource.brands.findIndex((b) => b.brand === brand);
        if (update_type === "addtype") {
          resource.brands[brandIndex].types.push({
            type: device_type,
            specs: [],
            colors: body.colors,
          });
        } else if (update_type === "deletetype") {
          const typeIndex = resource.brands[brandIndex].types.findIndex(
            (t) => t.type === device_type
          );

          resource.brands[brandIndex].types.splice(typeIndex, 1);
        }
      } else if (update_type.includes("spec")) {
        const { brand, device_type } = body;
        const brandIndex = resource.brands.findIndex((b) => b.brand === brand);
        const deviceIndex = resource.brands[brandIndex].types.findIndex(
          (t) => t.type === device_type
        );
        if (update_type === "addspec") {
          const {
            specs: { screen_size, cpu, ram, ssd },
            locations,
          } = body;

          resource.brands[brandIndex].types[deviceIndex].specs.push({
            spec: `${screen_size}, ${cpu}, ${ram.toUpperCase()} RAM, ${ssd.toUpperCase()} SSD`,
            locations,
          });
        } else if (update_type === "deletespec") {
          const specIndex = resource.brands[brandIndex].types[
            deviceIndex
          ].specs.findIndex((s) => s.spec === body.spec);

          resource.brands[brandIndex].types[deviceIndex].specs.splice(
            specIndex,
            1
          );
        }
      } else if (update_type.includes("locations")) {
        const { spec, brand, device_type } = body;
        const brandIndex = resource.brands.findIndex((b) => b.brand === brand);
        const deviceIndex = resource.brands[brandIndex].types.findIndex(
          (t) => t.type === device_type
        );
        const specIndex = resource.brands[brandIndex].types[
          deviceIndex
        ].specs.findIndex((s) => s.spec === spec);
        if (update_type === "editlocations") {
          const { locations } = body;

          resource.brands[brandIndex].types[deviceIndex].specs[
            specIndex
          ].locations = locations;
        }
      } else if (update_type === "deleteitem") {
        const item = marketplaceContainer.container.item(id, client);
        await item.delete();
        return "Done";
      }

      const { resource: replaced } = await marketplaceContainer.container
        .item(id, client)
        .replace(resource);

      return replaced;
    } else if (update_type === "newitem") {
      const newid =
        type.replace(/\s+/g, "-").toLowerCase() +
        "-" +
        client.replace(/\s+/g, "-").toLowerCase();
      const { resource: doc } =
        await marketplaceContainer.container.items.create({
          id: newid,
          client,
          item_type: type,
          imgSrc:
            "https://spokeimages.blob.core.windows.net/image/comingsoon.jpeg",
          brands: [],
        });
      return doc;
    }
  }

  async marketplaceUpdateSelections(id, client_key, new_doc) {
    const marketplaceContainer = await this.database
      .container("MarketplaceInventory")
      .read();

    const { resource: replaced } = await marketplaceContainer.container
      .item(id, client)
      .replace(new_doc);

    return replaced;
  }
}
export { Inventory };
