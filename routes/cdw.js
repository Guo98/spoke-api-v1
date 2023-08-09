import { Router } from "express";
import { cdwBasicAuth } from "../services/basicAuth.js";

const router = Router();

router.post("/cdw/order", async (req, res) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    console.log("/cdw/order => Unauthorized (Missing auth).");
    res.status(401).json({ status: "Unauthorized" });
  }

  const isAuthenticated = await cdwBasicAuth(req.headers.authorization);

  if (isAuthenticated) {
    res.send("Hello World");
  } else {
    res.status(401).json({ status: "Unauthorized" });
  }
});

export default router;
