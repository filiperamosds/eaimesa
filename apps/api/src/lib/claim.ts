import { createHash, randomBytes, randomInt } from "node:crypto";

export function generateClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePin(): string {
  return String(randomInt(1000, 10000));
}
