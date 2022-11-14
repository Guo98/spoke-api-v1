import { Router } from "express";
import { basicAuth } from "../services/basicAuth.js";
// import { getAdminLogin } from "../services/database.js";

const router = Router();

router.post("/login", async (req, res) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  if (req.body && req.body !== {}) {
    const isAuthenticated = await basicAuth(req.headers.authorization);

    if (isAuthenticated) {
      // const resp = await addOffboardRow(req.body);
      // const result = await getAdminLogin(req.body);
      res.send({ message: "Success" });
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

router.post("/auth", async (req, res) => {});

export default router;
