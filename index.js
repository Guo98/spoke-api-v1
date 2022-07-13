import express from "express";
import bodyParser from "body-parser";
import { addRow } from "./services/googleSheets.js";
import { basicAuth } from "./services/basicAuth.js";
import "dotenv/config";
// defining the Express app
const app = express();
// defining an array to work as the database (temporary solution)
const ads = [{ title: "Hello, world (again)!" }];

// adding Helmet to enhance your Rest API's security
app.use(bodyParser.json());
// defining an endpoint to return all ads
app.get("/", (req, res) => {
  res.send(ads);
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
      const resp = await addRow(req.body);
      res.send(resp.data);
    } else {
      res.status(401).json({ message: "Wrong Authentication" });
    }
  } else {
    res.status(500).json({ message: "no body here" });
  }
});

// starting the server
app.listen(process.env.PORT || 3001, () => {
  console.log("listening on port: ", process.env.PORT);
});
