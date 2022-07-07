import express from "express";
import bodyParser from "body-parser";
import { addRow } from "./services/googleSheets.js";
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
  if (req.body && req.body !== {}) {
    const resp = await addRow(req.body);
    res.send(resp.data);
  } else {
    res.send({ message: "no body here" });
  }
});

// starting the server
app.listen(process.env.PORT || 3001, () => {
  console.log("listening on port: ", process.env.PORT);
});
