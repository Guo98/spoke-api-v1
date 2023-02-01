import { Router } from "express";
import { basicAuth } from "../services/basicAuth.js";
import { autocompleteAddress, validateAddress } from "../services/address.js";
import { checkJwt } from "../services/auth0.js";

const router = Router();

router.post("/validateAddress2", async (req, res) => {
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
        .then((data) => {
          if (data.status && data.status === 200) {
            res.send({ message: "Successful!" });
          } else {
            throw new Error("Undefined");
          }
        })
        .catch((err) => {
          res.status(500).json({ message: "Error validating address" });
        });
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

router.post("/autocompleteAddress", async (req, res) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  if (req.body && req.body !== {}) {
    const isAuthenticated = await basicAuth(req.headers.authorization);

    if (isAuthenticated) {
      autocompleteAddress(req.body.address)
        .then((data) => {
          if (data.status && data.status === 200) {
            res.send({ message: "Successful!", data: data.data.results });
          } else {
            throw new Error("Undefined");
          }
        })
        .catch((err) => {
          res.status(500).json({ message: "Error validating address" });
        });
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

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
      validateAddress(req.body.address)
        .then((data) => {
          // console.log("address data ::::: ", data);
          if (data.status && data.status === 200) {
            res.send({ message: "Successful!", data: data.data });
          } else {
            throw new Error(data.data);
          }
        })
        .catch((err) => {
          if (err.message === "not in the united states") {
            res.status(500).json({ message: "Country not supported" });
          } else {
            res.status(500).json({ message: "Error validating address" });
          }
        });
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

router.post("/validateAddressUI", checkJwt, async (req, res) => {
  if (req.body && req.body !== {}) {
    validateAddress(req.body.address)
      .then((data) => {
        // console.log("address data ::::: ", data);
        if (data.status && data.status === 200) {
          res.send({ message: "Successful!", data: data.data });
        } else {
          throw new Error(data.data);
        }
      })
      .catch((err) => {
        if (err.message === "not in the united states") {
          res.status(500).json({ message: "Country not supported" });
        } else {
          res.status(500).json({ message: "Error validating address" });
        }
      });
  } else {
    res.status(500).json({ message: "Missing Body" });
  }
});

export default router;
