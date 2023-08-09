import { Router } from "express";
import { checkJwt } from "../services/auth0";

const router = Router();

router.post("/newclient", async (req, res) => {
  const { client_name } = req.body;
});

export default router;
