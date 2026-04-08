import { Pool } from "pg";

const { DATABASE_URL, NODE_ENV } = process.env;

if (!DATABASE_URL) throw new Error("DATABASE_URL is missing in .env");

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("PG pool error:", err);
});

export default {
  async ping() {
    const client = await pool.connect();
    try {
      const r = await client.query("SELECT NOW()");
      return r.rows[0];
    } finally {
      client.release();
    }
  },
  query: (text: string, params?: any[]) => {
    if (NODE_ENV !== "production") {
      console.log("SQL:", text);
      if (params?.length) console.log("params:", params);
    }
    return pool.query(text, params);
  },
};
