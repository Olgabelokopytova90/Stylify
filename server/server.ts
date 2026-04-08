// server/server.ts
import path from "path";
import "dotenv/config";
import dotenv from "dotenv";
import type { Request, Response, NextFunction } from "express";
import express from "express";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import db from "./db/connect";

import outfitRoutes from "./routes/outfitRoutes";
import userRouter from "./routes/userRoutes";
import avatarRouter from "./routes/avatarRoutes";
import itemRoutes from "./routes/itemRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

console.log("DB URL starts with:", process.env.DATABASE_URL?.slice(0, 35));

app.use(express.json());

// health-check для оркестратора/браузера
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// явный ping к БД
app.get("/api/dbcheck", async (_req, res) => {
  try {
    const now = await db.ping();
    res.json({ ok: true, now });
  } catch (e: any) {
    console.error("DB check failed:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

(async () => {
  try {
    const now = await db.ping();
    console.log("✅ DB connected:", now);
  } catch (e) {
    console.error("❌ DB connect failed:", e);
  }
})();

app.use("/api/users", userRouter);
app.use("/api/avatars", avatarRouter);
app.use("/api/outfits", outfitRoutes);
app.use("/api/items", itemRoutes);

app.use((req, res) => {
  res.status(404).send("oops, nothing here!");
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const defaultErr = {
    log: "Express error handler caught unknown middleware error",
    status: 500,
    message: { err: "An error occurred" },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  console.error(errorObj.log, err);
  return res.status(errorObj.status).json(errorObj.message);
});

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});

export default app;
