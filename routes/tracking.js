import { Router } from "express";
import { getTrackingNumber } from "../utils/emailParser.js";
import { getEmailId } from "../services/gmail.js";

const router = Router();

router.post("/pushTracking", async (req, res) => {
  const historyData = JSON.parse(atob(req.body.message.data));
  console.log("reaches this here :::: ", historyData);
  if (historyData.historyId) await getEmailId(historyData.historyId);
  getTrackingNumber();
  res.send("Hello World!");
});

export default router;
