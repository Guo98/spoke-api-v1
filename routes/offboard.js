import { Router } from "express";
import { addOffboardRow } from "../services/googleSheets.js";
import { basicAuth } from "../services/basicAuth.js";

const router = Router();

router.post("/offboard", async (req, res) => {
  console.log("/offboard => Starting route.");
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    console.log("/offboard => Unauthorized (Missing auth).");
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  if (req.body && req.body !== {}) {
    const isAuthenticated = await basicAuth(req.headers.authorization);

    if (isAuthenticated) {
      console.log("/offboard => Starting addOffboardRow function.");
      const resp = await addOffboardRow(req.body);
      console.log("/offboard => Ending route.");
      res.send(resp.data);
    } else {
      console.log("/offboard => Unauthorized (Wrong header).");
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    console.log("/offbaord => Missing post body in request.");
    res.status(500).json({ message: "Missing Body" });
  }
});

router.post("/slackoffboard", async (req, res) => {
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
