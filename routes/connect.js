import { Router } from "express";
import { MergeClient } from "@mergeapi/merge-node-client";

const router = Router();

const merge = new MergeClient({});

router.get("/connect/:platform", async (req, res) => {
  res.send("Hello World");
});

export default router;
