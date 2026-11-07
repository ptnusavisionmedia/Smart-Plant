import type Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Online backup via SQLite's own backup API (T-54) — safe to run against a
 * live WAL-mode database without pausing writers. Progress callback is
 * useful for very large files; we don't need it at our V1 scale.
 */
export async function backupDatabase(sqlite: Database.Database, destFile: string): Promise<void> {
  mkdirSync(dirname(destFile), { recursive: true });
  await sqlite.backup(destFile);
}
