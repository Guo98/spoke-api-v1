class Spoke {
  constructor(cosmosClient, databaseId) {
    this.client = cosmosClient;
    this.databaseId = databaseId;

    this.database = null;
    this.slackContainer = null;
    this.clientContainer = null;
  }

  async init() {
    const dbResponse = await this.client.databases.createIfNotExists({
      id: this.databaseId,
    });

    this.database = dbResponse.database;

    const coResponse = await this.database.containers.createIfNotExists({
      id: "slack",
    });

    this.slackContainer = coResponse.container;

    const clientResponse = await this.database.containers.createIfNotExists({
      id: "client",
    });

    this.clientContainer = clientResponse.container;
  }

  async getSlackTeams() {
    const { resources: receivedList } = await this.slackContainer.items
      .readAll()
      .fetchAll();

    return receivedList;
  }

  async newSlackTeam(team_name, team_id, access_token, client, user_id) {
    const { resource: doc } = await this.slackContainer.items.create({
      id: team_id,
      slack_team_name: team_name,
      access_token,
      client,
      allowed_users: [user_id],
    });

    return doc;
  }

  async addNewUser(doc_id, user_id) {
    const { resource } = await this.slackContainer.item(doc_id, doc_id).read();

    resource.allowed_users = [...resource.allowed_users, user_id];

    const { resource: replaced } = await this.slackContainer
      .item(doc_id, doc_id)
      .replace(resource);

    return replaced;
  }

  async addNewClient(
    client,
    allowed_pages = ["Orders", "Inventory", "Marketplace", "Approvals"],
    org_id,
    connections,
    employee_portal
  ) {
    let client_doc = {
      client,
      allowed_pages,
      users: [],
      entities: [],
      connections,
      org_id,
      employee_portal,
    };

    if (employee_portal) {
      client_doc.employees = [];
    }

    const { resource: doc } = await this.clientContainer.items.create(
      client_doc
    );

    return doc;
  }

  async checkUserClient(user_email) {
    const { resources: receivedList } = await this.clientContainer.items
      .readAll()
      .fetchAll();

    let client_obj = {};

    for (const client of receivedList) {
      if (client.users.findIndex((user) => user === user_email) > -1) {
        client_obj = client;
        client_obj.role = "Admin";
        break;
      }

      if (client.employee_portal) {
        if (client.employees.findIndex((user) => user === user_email) > -1) {
          client_obj = client;
          client_obj.role = "Employee";
          break;
        }
      }
    }

    return client_obj;
  }

  async addNewUserPortal(client, user_email, role) {
    const { resources: receivedList } = await this.clientContainer.items
      .readAll()
      .fetchAll();

    const client_index = receivedList.findIndex((c) => c.client === client);

    if (client_index > -1) {
      let client_resource = receivedList[client_index];
      if (role === "employee") {
        if (client_resource.employees.findIndex((e) => e === user_email) < 0) {
          client_resource.employees.push(user_email);
        } else {
          return "User already invited";
        }
      } else {
        if (client_resource.users.findIndex((u) => u === user_email) < 0) {
          client_resource.users.push(user_email);
        } else {
          return "User already invited";
        }
      }
      const { resource: replaced } = await this.clientContainer
        .item(client_resource.id, client)
        .replace(client_resource);
      return replaced;
    } else {
      return "";
    }
  }
}

export { Spoke };
