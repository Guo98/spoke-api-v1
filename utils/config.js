var config = {};

config.endpoint = process.env.COSMOS_ENDPOINT;
config.key = process.env.COSMOS_KEY;

config.database = {
  id: "Spoke",
};

config.container = {
  id: "Orders",
};

export { config };
