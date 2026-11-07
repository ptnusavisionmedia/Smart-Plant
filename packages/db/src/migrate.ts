import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client.js";
import { resolveDatabaseFile } from "./env.js";

const file = resolveDatabaseFile();
const { db, sqlite } = createDb({ file });

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

console.log(`[db] migrating ${file}`);
migrate(db, { migrationsFolder });
console.log("[db] migration complete");

sqlite.close();
