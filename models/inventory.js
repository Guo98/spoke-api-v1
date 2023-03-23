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
}
export { Inventory };
