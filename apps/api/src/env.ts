import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

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

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável ${name} ausente. Copie .env.example para .env`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  ownerJwtSecret: req("OWNER_JWT_SECRET"),
  ownerJwtTtlHours: Number(process.env.OWNER_JWT_TTL_HOURS ?? 12),
  staffJwtSecret: req("STAFF_JWT_SECRET"),
  staffJwtTtlHours: Number(process.env.STAFF_JWT_TTL_HOURS ?? 12),
  guestSessionSecret: req("GUEST_SESSION_SECRET"),
  guestSessionTtlHours: Number(process.env.GUEST_SESSION_TTL_HOURS ?? 4),
  claimTtlSeconds: Number(process.env.CLAIM_TTL_SECONDS ?? 180),
};

export const isProd = env.nodeEnv === "production";
