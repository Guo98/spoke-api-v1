// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const helmet = require("helmet");
// const morgan = require("morgan");
// const addRow = require("./services/googleSheets");
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { addRow } from "./services/googleSheets.js";
// defining the Express app
const app = express();
// defining an array to work as the database (temporary solution)
const ads = [{ title: "Hello, world (again)!" }];

// adding Helmet to enhance your Rest API's security
app.use(helmet());

// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// enabling CORS for all requests
app.use(cors());

// adding morgan to log HTTP requests
app.use(morgan("combined"));

// defining an endpoint to return all ads
app.get("/", (req, res) => {
  res.send(ads);
});

app.post("/offboard", async (req, res) => {
  const resp = await addRow();
  res.send(resp.data);
});

// starting the server
app.listen(3001, () => {
  console.log("listening on port 3001");
});
