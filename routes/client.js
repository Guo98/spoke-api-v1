import { Router } from "express";
import { checkJwt } from "../services/auth0.js";
import { createOrdersContainer } from "./orders.js";
import { createInventoryContainer } from "./inventory.js";

const router = Router();

router.post("/newclient", checkJwt, async (req, res) => {
  const { client_name } = req.body;
  await createOrdersContainer(client_name);
  await createInventoryContainer(client_name);
  res.send("Hello World");
});

export default router;
