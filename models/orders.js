const partitionKey = undefined;

class Orders {
  constructor(cosmosClient, databaseId, containerId) {
    this.client = cosmosClient;
    this.databaseId = databaseId;
    this.collectionId = containerId;

    this.database = null;
    this.container = null;
    this.emailContainer = null;
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

    const emailCoResponse = await this.database.containers.createIfNotExists({
      id: "email",
    });
    this.emailContainer = emailCoResponse.container;
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

  async addItem(item) {
    item.date = Date.now();
    // item.completed = false;
    const { resource: doc } = await this.container.items.create(item);
    return doc;
  }

  async updateOrder(itemId, fullNameKey, items) {
    const doc = await this.getItem(itemId, fullNameKey);

    doc.items = items;

    const { resource: replaced } = await this.container
      .item(itemId, partitionKey)
      .replace(doc);

    return replaced;
  }

  async getAllReceived() {
    const { resources: receivedList } = await this.container.items
      .readAll()
      .fetchAll();
    return receivedList;
  }

  async getItem(itemId, fullNameKey) {
    const { resource } = await this.container.item(itemId, fullNameKey).read();

    return resource;
  }

  async getLastReadEmail() {
    const { resource } = await this.emailContainer
      .item("historyid", "historyid")
      .read();

    return resource;
  }

  async updateHistoryId(updateObj) {
    const { resource: replaced } = await this.emailContainer
      .item("historyid", "historyid")
      .replace(updateObj);

    return replaced;
  }
}
export { Orders };
