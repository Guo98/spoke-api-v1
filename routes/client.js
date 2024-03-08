import { Router } from "express";
import { checkJwt, createNewClient } from "../services/auth0.js";
import { createOrdersContainer } from "./orders.js";
import { createInventoryContainer } from "./inventory.js";
import { spoke } from "./slack.js";

const router = Router();

router.post("/client/new", checkJwt, async (req, res) => {
  const { client_name, connections, allowed_pages } = req.body;

  const org_id = await createNewClient(
    client_name,
    connections.google,
    connections.microsoft
  );

  if (org_id !== "") {
    let enabled_connections = [];

    if (connections.google) {
      enabled_connections.push("google");
    }

    if (connections.microsoft) {
      enabled_connections.push("microsoft");
    }

    await spoke.addNewClient(
      client_name,
      allowed_pages,
      org_id,
      enabled_connections
    );
  } else {
    res.status(500).json({ status: "Error" });
  }

  await createOrdersContainer(client_name);
  await createInventoryContainer(client_name);

  if (!res.headersSent) res.send({ status: "Successful" });
});

router.get("/client/:user_email", checkJwt, async (req, res) => {
  const { user_email } = req.params;

  let client_obj = await spoke.checkUserClient(user_email);

  if (Object.keys(client_obj).length > 0) {
    delete client_obj.users;
    delete client_obj.connections;
    delete client_obj._rid;
    delete client_obj._self;
    delete client_obj._etag;
    delete client_obj._attachments;
    delete client_obj._ts;

    res.json({ status: "Successful", ...client_obj });
  } else {
    res.status(500).json({ status: "Error" });
  }
});

export default router;
