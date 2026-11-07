import { eq, inArray } from "drizzle-orm";
import type { Thresholds, DeviceConfig } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { deviceConfigs } from "../schema/index.js";

function toDeviceConfig(row: typeof deviceConfigs.$inferSelect): DeviceConfig {
  return {
    deviceId: row.deviceId,
    thresholds: JSON.parse(row.thresholds) as Thresholds,
    targetMoisture: row.targetMoisture,
    maxPumpSeconds: row.maxPumpSeconds,
    cooldownSeconds: row.cooldownSeconds,
    telemetryIntervalSeconds: row.telemetryIntervalSeconds,
    waterLevelSource: row.waterLevelSource,
    tankHeightCm: row.tankHeightCm,
    tankMaxLevelCm: row.tankMaxLevelCm,
    configVersion: row.configVersion,
  };
}

export function createConfigsRepository(db: Db) {
  return {
    getByDeviceId(deviceId: string): DeviceConfig | undefined {
      const row = db.select().from(deviceConfigs).where(eq(deviceConfigs.deviceId, deviceId)).get();
      return row ? toDeviceConfig(row) : undefined;
    },

    /** Raw row, including acceptedAt — used by the watering policy to check CONFIG_NOT_ACCEPTED. */
    getRawByDeviceId(deviceId: string) {
      return db.select().from(deviceConfigs).where(eq(deviceConfigs.deviceId, deviceId)).get();
    },

    /** Batch form of getByDeviceId — avoids N+1 queries when summarizing a device list (T-52). */
    getByDeviceIds(deviceIds: string[]): Map<string, DeviceConfig> {
      if (deviceIds.length === 0) return new Map();
      const rows = db.select().from(deviceConfigs).where(inArray(deviceConfigs.deviceId, deviceIds)).all();
      return new Map(rows.map((row) => [row.deviceId, toDeviceConfig(row)]));
    },

    create(config: DeviceConfig) {
      db.insert(deviceConfigs)
        .values({
          deviceId: config.deviceId,
          thresholds: JSON.stringify(config.thresholds),
          targetMoisture: config.targetMoisture,
          maxPumpSeconds: config.maxPumpSeconds,
          cooldownSeconds: config.cooldownSeconds,
          telemetryIntervalSeconds: config.telemetryIntervalSeconds,
          waterLevelSource: config.waterLevelSource,
          tankHeightCm: config.tankHeightCm,
          tankMaxLevelCm: config.tankMaxLevelCm,
          configVersion: config.configVersion,
          acceptedAt: null,
          updatedAt: Date.now(),
        })
        .run();
    },

    /** Applies a partial update and bumps configVersion; acceptedAt is cleared until the firmware acks it. */
    update(
      deviceId: string,
      patch: Partial<Omit<DeviceConfig, "deviceId" | "configVersion" | "thresholds">> & {
        thresholds?: Partial<Thresholds>;
      },
    ) {
      const current = this.getByDeviceId(deviceId);
      if (!current) throw new Error(`device_configs not found for device ${deviceId}`);

      const next: DeviceConfig = {
        ...current,
        ...patch,
        thresholds: patch.thresholds ? { ...current.thresholds, ...patch.thresholds } : current.thresholds,
        configVersion: current.configVersion + 1,
      };

      db.update(deviceConfigs)
        .set({
          thresholds: JSON.stringify(next.thresholds),
          targetMoisture: next.targetMoisture,
          maxPumpSeconds: next.maxPumpSeconds,
          cooldownSeconds: next.cooldownSeconds,
          telemetryIntervalSeconds: next.telemetryIntervalSeconds,
          waterLevelSource: next.waterLevelSource,
          tankHeightCm: next.tankHeightCm,
          tankMaxLevelCm: next.tankMaxLevelCm,
          configVersion: next.configVersion,
          acceptedAt: null,
          updatedAt: Date.now(),
        })
        .where(eq(deviceConfigs.deviceId, deviceId))
        .run();

      return next;
    },

    markAccepted(deviceId: string, configVersion: number) {
      db.update(deviceConfigs)
        .set({ acceptedAt: Date.now() })
        .where(eq(deviceConfigs.deviceId, deviceId))
        .run();
      void configVersion; // reserved for future stale-ack detection
    },
  };
}

export type ConfigsRepository = ReturnType<typeof createConfigsRepository>;
export { toDeviceConfig };
