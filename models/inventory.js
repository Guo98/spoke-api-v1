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
    grade = ""
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
      .container(client === "public" ? "Mock" : containerId)
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

          if (brandIndex === 0 && resource.brands.length === 1) {
            resource.brands = [];
          } else {
            resource.brands.splice(brandIndex, 1);
          }
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
          if (
            resource.brands[brandIndex].types.length === 1 &&
            typeIndex === 0
          ) {
            resource.brands[brandIndex].types = [];
          } else {
            resource.brands[brandIndex].types.splice(typeIndex, 1);
          }
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

          if (
            specIndex === 0 &&
            resource.brands[brandIndex].types[deviceIndex].specs.length === 1
          ) {
            resource.brands[brandIndex].types[deviceIndex].specs = [];
          } else {
            resource.brands[brandIndex].types[deviceIndex].specs.splice(
              specIndex,
              1
            );
          }
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
      }

      const { resource: replaced } = await marketplaceContainer.container
        .item(id, client)
        .replace(resource);

      return replaced;
    } else if (update_type === "newitem") {
      const newid =
        type.toLowerCase() + "-" + client.replace(/\s+/g, "-").toLowerCase();
      const { resource: doc } =
        await marketplaceContainer.container.items.create({
          id: newid,
          client,
          item_type: type,
          imgSrc:
            "https://spokeimages.blob.core.windows.net/image/comingsoon.jpeg",
        });
      return doc;
    }
  }
}
export { Inventory };
