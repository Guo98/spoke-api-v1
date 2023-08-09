import { Router } from "express";
import { checkJwt } from "../services/auth0.js";
import { checkStock } from "../services/ai.js";

const router = Router();

router.get("/checkstock/:item_name", checkJwt, async (req, res) => {
  const { item_name } = req.params;
  try {
    const aiResult = await checkStock(item_name);
    res.json({ status: "Successful", data: aiResult });
  } catch (e) {
    console.log(`/checkstock/${item_name} => Error in checking stock: `, e);
    res.status(500).json({ status: "Error" });
  }
});

export default router;
