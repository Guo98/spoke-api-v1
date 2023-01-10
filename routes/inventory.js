import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../utils/config.js";
import { Inventory } from "../models/inventory.js";

const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});

const inventory = new Inventory(cosmosClient, "Inventory", "Mock");

inventory
  .init((err) => {
    console.log("cosmos inventory db init err: ", err);
  })
  .catch((err) => {
    console.error("cosmos inventory db shutting down because of error: ", err);
    process.exit(1);
  });

const router = Router();

router.get("/getInventory/:company", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  const company = req.params.company;
  let dbContainer = "";
  switch (company) {
    case "public":
      dbContainer = "Mock";
      break;
    default:
      break;
  }
  if (dbContainer !== "") {
    const inventoryRes = await inventory.getAll(dbContainer);

    inventoryRes.forEach((device) => {
      delete device._rid;
      delete device._self;
      delete device._etag;
      delete device._attachments;
      delete device._ts;
    });
    res.json({ data: inventoryRes });
  } else {
    res.send("Hello World");
  }
});

export default router;
