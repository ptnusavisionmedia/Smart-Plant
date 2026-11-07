import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, createRepositories, seedSystemPlantProfiles, type Repositories } from "@smart-plant/db";
import { SYSTEM_PLANT_PROFILES, DEFAULT_DEVICE_CONFIG, RAW_READINGS_RETENTION_DAYS } from "@smart-plant/shared";
import { computeStats, formatStats } from "./stats.js";

/**
 * DB size & insert-throughput projection (T-52) — measures the ACTUAL on-disk
 * growth of a real migrated SQLite file as readings are inserted through the
 * same `repos.readings.insertBatch` path the MQTT bridge uses (100-row /
 * 100ms batches, see `apps/api/src/plugins/mqtt.ts`), then projects the
 * sensor_readings size at the raw-data retention window for a range of
 * device counts and telemetry intervals.
 *
 * This part of T-52 needs no broker or Docker — it runs entirely against a
 * throwaway on-disk SQLite file.
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const migrationsFolder = join(repoRoot, "packages", "db", "migrations");

const SAMPLE_DEVICE_COUNT = 20;
const SAMPLE_BATCHES = 80; // 80 * 100 rows = 8,000 sample rows, well past WAL checkpoint noise

const PROJECTION_SCENARIOS: Array<{ devices: number; intervalSeconds: number }> = [
  { devices: 20, intervalSeconds: 30 },
  { devices: 100, intervalSeconds: 30 },
  { devices: 100, intervalSeconds: 10 },
  { devices: 500, intervalSeconds: 30 },
];

function fileSizeBytes(file: string): number {
  // WAL mode keeps recent writes in -wal until a checkpoint; a manual
  // checkpoint makes the main file reflect everything inserted so far.
  return statSync(file).size;
}

async function main() {
  const workDir = mkdtempSync(join(tmpdir(), "smart-plant-db-projection-"));
  const dbFile = join(workDir, "smartplant.db");

  try {
    const { db, sqlite } = createDb({ file: dbFile });
    migrate(db, { migrationsFolder });
    seedSystemPlantProfiles(db);

    const repos: Repositories = createRepositories(db);
    const user = repos.users.create({ name: "DB Projection", email: "db-projection@example.invalid", passwordHash: "n/a" });
    const profile = repos.profiles.listForUser(user.id).find((p) => p.isSystem)!;

    const deviceIds: string[] = [];
    for (let i = 0; i < SAMPLE_DEVICE_COUNT; i++) {
      const provisioned = repos.devices.provision({
        deviceUid: `db-projection-${i}`,
        claimCodeHash: `hash-${i}`,
        claimCodeExpiresAt: Date.now() + 1000,
        mqttSecretHash: `secret-${i}`,
      });
      repos.devices.claim(provisioned.id, { userId: user.id, name: `Device ${i}`, location: null, plantProfileId: profile.id });
      repos.configs.create({ deviceId: provisioned.id, thresholds: SYSTEM_PLANT_PROFILES[0]!.thresholds, ...DEFAULT_DEVICE_CONFIG });
      deviceIds.push(provisioned.id);
    }

    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    const baselineBytes = fileSizeBytes(dbFile);

    const batchDurationsMs: number[] = [];
    let now = Date.now();
    let rowsInserted = 0;
    for (let b = 0; b < SAMPLE_BATCHES; b++) {
      const batch = Array.from({ length: 100 }, (_, k) => {
        const deviceId = deviceIds[(b * 100 + k) % deviceIds.length]!;
        now += 30_000; // strictly increasing, so (deviceId, time) never collides
        return {
          deviceId,
          time: now,
          soilMoisture: 40 + Math.random() * 20,
          temperature: 26 + Math.random() * 4,
          humidity: 55 + Math.random() * 15,
          waterLevel: 60 + Math.random() * 30,
          waterLevelCm: 18 + Math.random() * 6,
          waterLevelSource: "ultrasonic" as const,
          pumpOn: false,
          status: "NORMAL",
        };
      });
      const started = performance.now();
      repos.readings.insertBatch(batch);
      batchDurationsMs.push(performance.now() - started);
      rowsInserted += batch.length;
    }

    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    const afterBytes = fileSizeBytes(dbFile);
    sqlite.close();

    const bytesPerRow = (afterBytes - baselineBytes) / rowsInserted;

    console.log("=== DB insert-throughput & size projection report (T-52) ===");
    console.log(`sample: ${SAMPLE_DEVICE_COUNT} devices, ${rowsInserted} rows inserted in ${SAMPLE_BATCHES} batches of 100`);
    console.log(formatStats("batch_flush (insertBatch of 100 rows)", computeStats(batchDurationsMs)));
    console.log(
      `measured sensor_readings growth: ${(afterBytes - baselineBytes).toLocaleString()} bytes / ${rowsInserted} rows ` +
        `= ${bytesPerRow.toFixed(1)} bytes/row (file-level, includes the idx_readings_time index)`,
    );
    console.log("");
    console.log(`projected sensor_readings size at ${RAW_READINGS_RETENTION_DAYS}-day raw retention:`);
    console.log("devices | interval | rows/device/day | total rows (90d) | projected size");
    for (const scenario of PROJECTION_SCENARIOS) {
      const rowsPerDeviceDay = Math.round(86_400 / scenario.intervalSeconds);
      const totalRows = rowsPerDeviceDay * RAW_READINGS_RETENTION_DAYS * scenario.devices;
      const projectedBytes = totalRows * bytesPerRow;
      console.log(
        `${String(scenario.devices).padStart(7)} | ${String(scenario.intervalSeconds).padStart(6)}s  | ` +
          `${String(rowsPerDeviceDay).padStart(16)} | ${totalRows.toLocaleString().padStart(17)} | ${(projectedBytes / 1024 / 1024).toFixed(1)} MiB`,
      );
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("[loadtest:db] failed:", err);
  process.exit(1);
});
