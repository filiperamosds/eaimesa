import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function loadEnv() {
  const candidates = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
  for (const p of candidates) {
    if (existsSync(p)) {
      config({ path: p });
      return;
    }
  }
}

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env");
}

export const sql = postgres(url, { max: 10 });
export const db = drizzle(sql, { schema });
export { schema };
