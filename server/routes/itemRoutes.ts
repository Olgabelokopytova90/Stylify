// routes/itemsRoutes.ts
import express from "express";
import db from "../db/connect";

const router = express.Router();

// Простой эндпоинт для проверки данных
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, category, image, style_tags
      FROM items
      LIMIT 20;
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Erorr for getting items:", err);
    res.status(500).json({ error: "Server's error" });
  }
});

export default router;
