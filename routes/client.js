import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";
import { checkJwt } from "../services/auth0";

const router = Router();

router.post("/addNewClient", async (req, res) => {
  const { client_name } = req.body;
});

export default router;
