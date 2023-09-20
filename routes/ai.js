import { Router } from "express";
import { checkJwt } from "../services/auth0.js";
import { checkItemStock, newCheckStock } from "../services/ai/ai.js";

const router = Router();

// router.get("/checkstock/:item_name", checkJwt, async (req, res) => {
//   const { item_name } = req.params;
//   try {
//     const aiResult = await checkStock(item_name);
//     res.json({ status: "Successful", data: aiResult });
//   } catch (e) {
//     console.log(`/checkstock/${item_name} => Error in checking stock: `, e);
//     res.status(500).json({ status: "Error" });
//   }
// });

router.post("/checkstock", async (req, res) => {
  const { item_name, specs, supplier, others } = req.body;
  try {
    if (req.body.product_link) {
      const aiResult = await checkItemStock(
        req.body.product_link,
        item_name,
        specs,
        supplier
      );
      res.json({ status: "Successful", data: aiResult });
    } else {
      const aiResult = await newCheckStock(item_name, specs, supplier, others);
      res.json({ status: "Successful", data: aiResult });
    }
  } catch (e) {
    console.log(
      `/checkstock/${item_name} => Error in checking stock: `,
      e.message
    );
    res.status(500).json({ status: "Error" });
  }
});

// router.get("/recommendations/:item_name", checkJwt, async (req, res) => {
//   const { item_name } = req.params;
//   await getRecommendations(item_name);
//   res.send("Hello World");
// });

// https://www.insight.com/en_US/search.html?q=lenovo%20thinkpad%20p14s%2014%22%20i7%201360p%2032gb%201tb&selectedFacet=CategoryPath_en_US_ss_lowest_s%3ALaptops&qsrc=k

export default router;
