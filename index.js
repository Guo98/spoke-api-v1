import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { checkJwt } from "./services/auth0.js";
import "dotenv/config";
// defining the Express app
const app = express();

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

// adding Helmet to enhance your Rest API's security
app.use(bodyParser.json());
app.use(
  express.urlencoded({
    extended: true,
    verify: (req, _, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(cors(corsOptions));

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

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

app.use(routes.inventory);

app.use(routes.slack);

app.use(routes.documents);

app.use(routes.users);

app.use(routes.ai);

app.use(routes.client);

app.use(routes.cdw);

app.use(routes.connect);

app.use(routes.marketplace);

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// starting the server
app.listen(process.env.PORT || 3001, () => {
  console.log("listening on port: ", process.env.PORT);
});
