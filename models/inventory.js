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

  async getAll(containerId) {
    const coResponse = await this.database.containers.createIfNotExists({
      id: containerId,
    });
    const { resources: receivedList } = await coResponse.container.items
      .readAll()
      .fetchAll();
    return receivedList;
  }

  async getItem(itemId, fullNameKey) {
    const { resource } = await this.container.item(itemId, fullNameKey).read();

    return resource;
  }
}
export { Inventory };
