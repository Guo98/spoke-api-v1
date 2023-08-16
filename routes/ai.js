import { Router } from "express";
import { checkJwt } from "../services/auth0.js";
import { checkStock, getRecommendations } from "../services/ai.js";

const router = Router();

router.get("/checkstock/:item_name", async (req, res) => {
  const { item_name } = req.params;
  try {
    const aiResult = await checkStock(item_name);
    res.json({ status: "Successful", data: aiResult });
  } catch (e) {
    console.log(`/checkstock/${item_name} => Error in checking stock: `, e);
    res.status(500).json({ status: "Error" });
  }
});

router.get("/recommendations/:item_name", checkJwt, async (req, res) => {
  const { item_name } = req.params;
  await getRecommendations(item_name);
  res.send("Hello World");
});

export default router;
