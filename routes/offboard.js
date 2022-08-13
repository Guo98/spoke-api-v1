import { Router } from "express";
import { addOffboardRow } from "../services/googleSheets.js";
import { basicAuth } from "../services/basicAuth.js";

const router = Router();

router.post("/offboard", async (req, res) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  if (req.body && req.body !== {}) {
    const isAuthenticated = await basicAuth(req.headers.authorization);

    if (isAuthenticated) {
      const resp = await addOffboardRow(req.body);
      res.send(resp.data);
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

export default router;
