import { randomBytes } from "node:crypto";

export function newPublicId() {
  return randomBytes(6).toString("hex");
}
