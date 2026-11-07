import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema/index.js";

export type Db = BetterSQLite3Database<typeof schema>;

export interface CreateDbOptions {
  /** Path to the SQLite file, or ":memory:" for tests. */
  file: string;
}

/**
 * Opens the SQLite database and applies the PRAGMAs mandated by Tech Spec §2
 * (WAL, synchronous=NORMAL, foreign_keys=ON, busy_timeout=5000, temp_store=MEMORY).
 */
export function createDb({ file }: CreateDbOptions): { db: Db; sqlite: Database.Database } {
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("temp_store = MEMORY");

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}
