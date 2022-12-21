import express from "express";
import bodyParser from "body-parser";
import routes from "./routes/index.js";
import { checkJwt } from "./services/auth0.js";
import "dotenv/config";
// defining the Express app
const app = express();

// adding Helmet to enhance your Rest API's security
app.use(bodyParser.json());

// defining an endpoint to return all ads
app.get("/sitehealth", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/testingauth", checkJwt, (req, res) => {
  res.status(200).send("Successful auth!");
});

app.use(routes.offboard);

app.use(routes.redeploy);

app.use(routes.sendEmail);

app.use(routes.validation);

app.use(routes.login);

app.use(routes.orders);

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// starting the server
app.listen(process.env.PORT || 3001, () => {
  console.log("listening on port: ", process.env.PORT);
});
