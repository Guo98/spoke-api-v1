import { Router } from "express";
import { body } from "express-validator";
import { sendEmail } from "../services/sendEmail.js";
import { basicAuth } from "../services/basicAuth.js";
import { sendMarketplaceRequestEmail } from "../services/emails/marketplace.js";
import {
  sendReturnConfirmation,
  sendManualReminder,
} from "../services/emails/offboard.js";
import { checkJwt } from "../services/auth0.js";
import { marketplaceSentApprovalEmail } from "./orders.js";

const router = Router();

router.post(
  "/sendTrackingEmail",
  body("email").isEmail().normalizeEmail(),
  body("name").not().isEmpty().trim().escape(),
  body("tracking_number").not().isEmpty().trim().escape(),
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

router.post(
  "/sendConfirmationEmail",
  body("email").isEmail().normalizeEmail(),
  body("name").not().isEmpty().trim().escape(),
  body("address").not().isEmpty().trim().escape(),
  body("company").not().isEmpty().trim().escape(),
  async (req, res) => {
    console.log("/sendConfirmationEmail => Starting route.");
    if (
      !req.headers.authorization ||
      req.headers.authorization.indexOf("Basic") === -1
    ) {
      console.log("/sendConfirmationEmail => Unauthorized (Missing auth).");
      res.status(401).json({ message: "Missing Authorization Header" });
    }
    if (req.body && req.body !== {}) {
      const isAuthenticated = await basicAuth(req.headers.authorization);

      if (isAuthenticated) {
        console.log(
          "/sendConfirmationEmail => Starting sendReturnConfirmation function."
        );
        const resp = await sendReturnConfirmation(req.body);
        if (resp) {
          console.log("/sendConfirmationEmail => Ending route.");
          res.send(resp);
        } else {
          res.status(500).json({ message: "error sending email" });
        }
      } else {
        console.log("/sendConfirmationEmail => Unauthorized (Wrong header).");
        res.status(401).json({ message: "Wrong Authorization Header" });
      }
    } else {
      res.status(500).json({ message: "no body here" });
    }
  }
);

router.post("/sendemail/:email_type", checkJwt, async (req, res) => {
  const { email_type } = req.params;
  console.log(`/sendemail/${email_type} => Starting route.`);
  try {
    if (email_type === "approvalemail") {
      console.log(
        `/sendemail/${email_type} => Sending marketplace request approval email.`
      );
      await sendMarketplaceRequestEmail({ ...req.body, type: email_type });
      console.log(`/sendemail/${email_type} -=> Updating db.`);
      await marketplaceSentApprovalEmail(req.body.id, req.body.client);
    } else if (email_type === "manualreminder") {
      console.log(
        `/sendemail/${email_type} => Sending return manual reminder email.`
      );
      const manual_resp = await sendManualReminder(req.body);

      if (!manual_resp) {
        throw new Error("Error sending manual reminder email");
      }
    }
  } catch (e) {
    console.log(`/sendemail/${email_type} => Error in sending email:`, e);
    res.status(500).json({ status: "Error" });
  }
  console.log(`/sendemail/${email_type} => Finished route.`);
  if (!res.headersSent) res.json({ status: "Successful" });
});

export default router;
