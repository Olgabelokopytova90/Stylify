import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/connect";

const BASE_SQL = `
SELECT i.id, i.name, i.category, i.image, i.style_tags, i.z_index
FROM items i
LEFT JOIN item_seasons s ON s.item_id = i.id
WHERE i.category = $1
AND (
$2 = 'any'
OR $2 = ANY (COALESCE(i.style_tags, ARRAY[]::text[]))
)
AND (
$3 = 'all'
OR s.season = $3
OR s.season = 'all'
)
AND (i.universal_fit = true)
order by random()
limit $4`;
async function pickByCategory(
  category: string,
  opts: { style: string; season: string | null; limit: number }
) {
  const { style, season, limit } = opts;
  const { rows } = await pool.query(BASE_SQL, [
    category,
    style.toLowerCase(),
    season.toLowerCase(),
    limit,
  ]);
  return rows;
}

export async function getOutfit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = Number(req.query.userId ?? req.body.userId);
    const style = String(req.query.style ?? req.body.style ?? "any");
    const season = String(req.query.season ?? req.body.season ?? "all");
    const limitPerCategory = Number(req.query.limit ?? 3);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "invalid userId" });
    }

    const category = ["tops", "bottoms", "outerwear", "shoes"];

    const pairs = await Promise.all(
      category.map(async (cat) => {
        const items = await pickByCategory(cat, {
          style,
          season,
          limit: limitPerCategory,
        });
        return [cat, items] as const;
      })
    );
    const outfit: Record<string, any[]> = {};
    for (const [cat, items] of pairs) outfit[cat] = items;
    return res.status(200).json(outfit);
  } catch (error: any) {
    console.error("❌ Outfit error:", error.message, error.stack);
    return res.status(500).json({ err: error.message });
  }
}
