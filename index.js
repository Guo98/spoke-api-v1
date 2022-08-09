import express from "express";
import bodyParser from "body-parser";
import { body } from "express-validator";
import { addOffboardRow, addRedeployRow } from "./services/googleSheets.js";
import { basicAuth } from "./services/basicAuth.js";
import { sendEmail, sendConfirmation } from "./services/sendEmail.js";
import "dotenv/config";
// defining the Express app
const app = express();

// adding Helmet to enhance your Rest API's security
app.use(bodyParser.json());
// defining an endpoint to return all ads
app.get("/sitehealth", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.post("/offboard", async (req, res) => {
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
    res.status(500).json({ message: "no body here" });
  }
});

app.post("/redeploy", async (req, res) => {
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    res.status(401).json({ message: "Missing Authorization Header" });
  }

  if (req.body && req.body !== {}) {
    const isAuthenticated = await basicAuth(req.headers.authorization);

    if (isAuthenticated) {
      const resp = await addRedeployRow(req.body);
      res.send(resp.data);
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
  }
});

app.post(
  "/sendTrackingEmail",
  body("email")
    .isEmail()
    .normalizeEmail(),
  body("name")
    .not()
    .isEmpty()
    .trim()
    .escape(),
  body("tracking_number")
    .not()
    .isEmpty()
    .trim()
    .escape(),
  async (req, res) => {
    if (req.body && req.body !== {}) {
      const resp = await sendEmail(req.body);
      if (resp) {
        res.send(resp);
      } else {
        res.status(500).json({ message: "error sending email" });
      }
    } else {
      res.status(500).json({ message: "no body here" });
    }
  }
);

app.post(
  "/sendConfirmationEmail",
  body("email")
    .isEmail()
    .normalizeEmail(),
  body("name")
    .not()
    .isEmpty()
    .trim()
    .escape(),
  body("address")
    .not()
    .isEmpty()
    .trim()
    .escape(),
  body("company")
    .not()
    .isEmpty()
    .trim()
    .escape(),
  async (req, res) => {
    if (
      !req.headers.authorization ||
      req.headers.authorization.indexOf("Basic") === -1
    ) {
      res.status(401).json({ message: "Missing Authorization Header" });
    }
    if (req.body && req.body !== {}) {
      const isAuthenticated = await basicAuth(req.headers.authorization);

      if (isAuthenticated) {
        const resp = await sendConfirmation(req.body);
        if (resp) {
          res.send(resp);
        } else {
          res.status(500).json({ message: "error sending email" });
        }
      }
    } else {
      res.status(500).json({ message: "no body here" });
    }
  }
);

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// starting the server
app.listen(process.env.PORT || 3001, () => {
  console.log("listening on port: ", process.env.PORT);
});
