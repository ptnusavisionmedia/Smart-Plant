import { createHash } from "node:crypto";
import { rmSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, createRepositories, seedSystemPlantProfiles } from "@smart-plant/db";
import { E2E_DB_FILE, E2E_CLAIM_CODE, E2E_DEVICE_UID } from "./fixtures.js";

/**
 * Runs once, as its own process, chained via `&&` in front of the API
 * webServer's own startup command (see playwright.config.ts) so it always
 * finishes — and fully releases its file handle — before the server
 * process opens the same db file. Migrates a fresh on-disk SQLite db and
 * seeds one unclaimed device with a known claim code (claiming over HTTP is
 * otherwise the only way in, and the code is normally printed by firmware
 * we can't run here).
 */

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${E2E_DB_FILE}${suffix}`, { force: true });
}
mkdirSync(dirname(E2E_DB_FILE), { recursive: true });

const migrationsFolder = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));
const { db, sqlite } = createDb({ file: E2E_DB_FILE });
migrate(db, { migrationsFolder });
seedSystemPlantProfiles(db);
const repos = createRepositories(db);
repos.devices.provision({
  deviceUid: E2E_DEVICE_UID,
  claimCodeHash: sha256(E2E_CLAIM_CODE),
  claimCodeExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
  mqttSecretHash: sha256("unused-e2e-mqtt-secret"),
});
sqlite.pragma("wal_checkpoint(TRUNCATE)");
sqlite.close();
