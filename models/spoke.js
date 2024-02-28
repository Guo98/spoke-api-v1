class Spoke {
  constructor(cosmosClient, databaseId) {
    this.client = cosmosClient;
    this.databaseId = databaseId;

    this.database = null;
    this.slackContainer = null;
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
  }

  async getSlackTeams() {
    const { resources: receivedList } = await this.slackContainer.items
      .readAll()
      .fetchAll();

    return receivedList;
  }

  async newSlackTeam(team_name, team_id, access_token, client) {
    const { resource: doc } = await this.slackContainer.items.create({
      id: team_id,
      slack_team_name: team_name,
      access_token,
      client,
    });

    return doc;
  }
}

export { Spoke };
