import { validateAddress } from "../services/address.js";

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
    item.date = new Date().toLocaleDateString("en-US");
    // item.completed = false;
    const { resource: doc } = await this.container.items.create(item);
    return doc;
  }

  async addOrderByContainer(containerid, item) {
    const coResponse = await this.database.container(containerid).read();

    item.date = new Date().toLocaleDateString("en-US");

    const { resource: doc } = await coResponse.container.items.create(item);
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

  async updateOrderByContainer(containerId, itemId, fullNameKey, items) {
    const coResponse = await this.database.container(containerId).read();

    const { resource } = await coResponse.container
      .item(itemId, fullNameKey)
      .read();

    resource.items = items;

    const { resource: replaced } = await coResponse.container
      .item(itemId, fullNameKey)
      .replace(resource);

    return replaced;
  }

  async updateMarketOrder(
    itemId,
    clientKey,
    status = "",
    filename = "",
    price = "",
    approved = "",
    entity = ""
  ) {
    const coResponse = await this.database.container("Marketplace").read();

    const { resource } = await coResponse.container
      .item(itemId, clientKey)
      .read();

    if (status !== "") {
      resource.status = status;
    }
    if (filename !== "") {
      resource.quote = filename;
    }
    if (price !== "") {
      resource.quote_price = price;
    }
    if (approved !== "") {
      resource.approved = approved;
      if (approved) {
        const ordersResponse = await this.database
          .container(clientKey === "public" ? "Mock" : clientKey)
          .read();

        const addrResp = await validateAddress(resource.address, "system");

        let orderItem = {
          client: clientKey === "public" ? "Public" : clientKey,
          full_name: resource.recipient_name,
          email: resource.email,
          phone: resource.phone_number,
          orderNo: "APR" + resource.market_order,
          items: [
            {
              name: resource.device_type + " " + resource.specs,
              quantity: 1,
              price: resource.quote_price,
              tracking_number: "",
              type: "laptop",
            },
          ],
          shipping_status: "Incomplete",
        };

        if (addrResp.status && addrResp.status === 200) {
          orderItem.address = {
            city: addrResp.data.city,
            addressLine: addrResp.data.address_line1,
            addressLine2: addrResp.data.address_line2
              ? addrResp.data.address_line2
              : "",
            subdivision: addrResp.data.state,
            postalCode: addrResp.data.zipCode,
            country: addrResp.data.country,
          };
        }

        const { resource: doc } = await ordersResponse.container.items.create(
          orderItem
        );
      }
    }
    if (entity !== "") {
      resource.entity = entity;
    }

    const { resource: replaced } = await coResponse.container
      .item(itemId, clientKey)
      .replace(resource);

    return replaced;
  }

  async updateOrderStatusByContainer(containerId, itemId, fullNameKey, status) {
    const coResponse = await this.database.container(containerId).read();

    const { resource } = await coResponse.container
      .item(itemId, fullNameKey)
      .read();

    resource.shipping_status = status;

    const { resource: replaced } = await coResponse.container
      .item(itemId, fullNameKey)
      .replace(resource);

    return replaced;
  }

  async getAllReceived() {
    const { resources: receivedList } = await this.container.items
      .readAll()
      .fetchAll();
    return receivedList;
  }

  async getAllOrders(company) {
    const coResponse = await this.database.container(company).read();

    const { resources: receivedList } = await coResponse.container.items
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

  async removeFromReceived(id, name) {
    const item = this.container.item(id, name);
    await item.delete();
  }

  async deleteOrder(client, id, name) {
    const coResponse = await this.database
      .container(client === "public" || client === "Public" ? "Mock" : client)
      .read();

    const item = coResponse.container.item(id, name);

    await item.delete();
  }

  async completeOrder(client, obj) {
    const clientCoResponse = await this.database.container(client).read();
    let clientContainer = clientCoResponse.container;

    const { resource: doc } = await clientContainer.items.create(obj);

    return doc;
  }

  async updateClient(client, orders) {
    const coResponse = await this.database.container(client).read();
  }

  async updateMarketplaceClient(id, client) {
    const coResponse = await this.database.container("Marketplace").read();

    const item = coResponse.container.item(id, undefined);

    const { resource } = await item.read();

    const newItem = { ...resource, client };

    delete newItem.id;

    await item.delete();

    const { resource: doc } = await coResponse.container.items.create(newItem);

    return doc;
  }

  async sentMarketplaceEmail(id, client) {
    const coResponse = await this.database.container("Marketplace").read();
    const item = coResponse.container.item(id, client);

    const { resource } = await item.read();

    resource.email_sent = true;

    const { resource: replaced } = await coResponse.container
      .item(id, client)
      .replace(resource);

    return replaced;
  }
}
export { Orders };
