import { Router } from "express";
import { cdwBasicAuth } from "../services/basicAuth.js";
import { addNewDocument } from "./orders.js";

const router = Router();

router.post("/cdw/order", async (req, res) => {
  console.log("/cdw/order => Starting route.");
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    console.log("/cdw/order => Unauthorized (Missing auth).");
    res.status(401).json({ status: "Unauthorized" });
  }

  const isAuthenticated = await cdwBasicAuth(req.headers.authorization);

  if (isAuthenticated) {
    console.log("/cdw/order => Route authenticated.");
    const cdwRes = await addNewDocument("CDW", req.body);
    console.log("/cdw/order => Finished adding req body to CDW container.");
    if (!res.headersSent) res.send("Hello World");
  } else {
    res.status(401).json({ status: "Unauthorized" });
  }
  console.log("/cdw/order => Finished route.");
});

export default router;
