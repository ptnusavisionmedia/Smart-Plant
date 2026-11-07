import { and, between, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { sensorReadings, readingsDaily } from "../schema/index.js";

export interface InsertReadingInput {
  deviceId: string;
  time: number;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  waterLevel: number | null;
  waterLevelCm: number | null;
  waterLevelSource: "ultrasonic" | "float_switch";
  pumpOn: boolean;
  status: string;
  raw?: string | null;
}

export function createReadingsRepository(db: Db) {
  return {
    /** Batched insert in a single transaction — Tech Spec §5 "maks 100 baris / 100 ms". */
    insertBatch(readings: InsertReadingInput[]) {
      if (readings.length === 0) return;
      db.transaction((tx) => {
        for (const r of readings) {
          tx.insert(sensorReadings)
            .values({ ...r, raw: r.raw ?? null })
            .onConflictDoNothing()
            .run();
        }
      });
    },

    latestForDevice(deviceId: string) {
      return db
        .select()
        .from(sensorReadings)
        .where(eq(sensorReadings.deviceId, deviceId))
        .orderBy(desc(sensorReadings.time))
        .limit(1)
        .get();
    },

    /** Most recent N soil-moisture samples (oldest first), used for the 3-sample debounce. */
    recentSoilMoistureSamples(deviceId: string, n: number): Array<number | null> {
      const rows = db
        .select({ soilMoisture: sensorReadings.soilMoisture })
        .from(sensorReadings)
        .where(eq(sensorReadings.deviceId, deviceId))
        .orderBy(desc(sensorReadings.time))
        .limit(n)
        .all();
      return rows.map((r) => r.soilMoisture).reverse();
    },

    queryRaw(deviceId: string, fromMs: number, toMs: number) {
      return db
        .select()
        .from(sensorReadings)
        .where(and(eq(sensorReadings.deviceId, deviceId), between(sensorReadings.time, fromMs, toMs)))
        .orderBy(sensorReadings.time)
        .all();
    },

    /** Hourly buckets via on-demand aggregation (Tech Spec §2 "Hourly on-demand"). */
    queryHourly(deviceId: string, fromMs: number, toMs: number) {
      const bucketMs = 3600_000;
      return db
        .select({
          bucket: sql<number>`(${sensorReadings.time} / ${bucketMs}) * ${bucketMs}`,
          soilMoisture: sql<number | null>`avg(${sensorReadings.soilMoisture})`,
          temperature: sql<number | null>`avg(${sensorReadings.temperature})`,
          humidity: sql<number | null>`avg(${sensorReadings.humidity})`,
          waterLevel: sql<number | null>`avg(${sensorReadings.waterLevel})`,
        })
        .from(sensorReadings)
        .where(and(eq(sensorReadings.deviceId, deviceId), between(sensorReadings.time, fromMs, toMs)))
        .groupBy(sql`bucket`)
        .orderBy(sql`bucket`)
        .all();
    },

    /** Daily rollup table, for ranges beyond the 90-day raw retention window. */
    queryDaily(deviceId: string, fromDay: string, toDay: string) {
      return db
        .select()
        .from(readingsDaily)
        .where(and(eq(readingsDaily.deviceId, deviceId), between(readingsDaily.day, fromDay, toDay)))
        .orderBy(readingsDaily.day)
        .all();
    },

    /** Computes and upserts one day's rollup from raw data (daily-rollup job, 00:10 UTC). */
    rollupDay(deviceId: string, day: string, dayStartMs: number, dayEndMs: number) {
      const agg = db
        .select({
          soilAvg: sql<number | null>`avg(${sensorReadings.soilMoisture})`,
          soilMin: sql<number | null>`min(${sensorReadings.soilMoisture})`,
          soilMax: sql<number | null>`max(${sensorReadings.soilMoisture})`,
          tempAvg: sql<number | null>`avg(${sensorReadings.temperature})`,
          humidityAvg: sql<number | null>`avg(${sensorReadings.humidity})`,
          waterAvg: sql<number | null>`avg(${sensorReadings.waterLevel})`,
        })
        .from(sensorReadings)
        .where(and(eq(sensorReadings.deviceId, deviceId), between(sensorReadings.time, dayStartMs, dayEndMs)))
        .get();

      if (!agg) return;

      db.insert(readingsDaily)
        .values({ deviceId, day, ...agg })
        .onConflictDoUpdate({ target: [readingsDaily.deviceId, readingsDaily.day], set: agg })
        .run();
    },

    /** Deletes raw readings older than the cutoff (retention job, 90 days). */
    deleteRawOlderThan(cutoffMs: number) {
      return db.delete(sensorReadings).where(sql`${sensorReadings.time} < ${cutoffMs}`).run();
    },

    /** Deletes rollup rows older than the cutoff day (retention job, 2 years). */
    deleteRollupOlderThan(cutoffDay: string) {
      return db.delete(readingsDaily).where(sql`${readingsDaily.day} < ${cutoffDay}`).run();
    },
  };
}

export type ReadingsRepository = ReturnType<typeof createReadingsRepository>;
