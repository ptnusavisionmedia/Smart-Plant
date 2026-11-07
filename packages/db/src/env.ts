import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// packages/db/src/env.ts -> repo root is three levels up.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Resolves DATABASE_FILE relative to the repo root; falls back to the pilot default. */
export function resolveDatabaseFile(): string {
  const configured = process.env.DATABASE_FILE ?? "./infra/data/smartplant.db";
  return resolve(REPO_ROOT, configured);
}
