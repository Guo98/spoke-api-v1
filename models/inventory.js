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
}
export { Inventory };
