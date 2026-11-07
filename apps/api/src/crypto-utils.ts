import { timingSafeEqual } from "node:crypto";

/** Constant-time string equality — use for any secret comparison (never `===`). */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
