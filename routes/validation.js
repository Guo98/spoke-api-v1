import { Router } from "express";
import { basicAuth } from "../services/basicAuth.js";
import { validateAddress } from "../services/fedex.js";

const router = Router();

router.post("/validateAddress", async (req, res) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  if (req.body && req.body !== {}) {
    const isAuthenticated = await basicAuth(req.headers.authorization);

    if (isAuthenticated) {
      validateAddress(req.body)
        .then(data => {
          if (data.status && data.status === 200) {
            res.send({ message: "Successful!" });
          } else {
            throw new Error("Undefined");
          }
        })
        .catch(err => {
          res.status(500).json({ message: "Error generating token" });
        });
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

export default router;
