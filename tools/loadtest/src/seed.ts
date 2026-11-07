import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createDb, createRepositories, seedSystemPlantProfiles, type Repositories } from "@smart-plant/db";
import { SYSTEM_PLANT_PROFILES, DEFAULT_DEVICE_CONFIG } from "@smart-plant/shared";

/**
 * Seeds users/devices/readings directly through the repositories, bypassing
 * HTTP — exactly like `packages/db/src/repositories/repositories.test.ts`
 * does, and the same fixture-creation pattern as `tools/provision-device.ts`.
 *
 * This is deliberate: claiming a device over HTTP is rate-limited to 5/hour
 * per user by design (an abuse control on the claim-code endpoint, Tech Spec
 * §5), so a 100-device load test seeds its fixtures the way an operator's
 * provisioning script would, and spends the actual HTTP calls under test on
 * the read/write endpoints the performance budget in T-52 cares about.
 *
 * `userId` must belong to a user created through the real
 * `POST /auth/register` endpoint (the caller logs in as that user for the
 * authenticated load-test traffic) — seeding never mints its own login.
 */

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export interface SeededDevice {
  deviceId: string;
  deviceUid: string;
  /** Plaintext MQTT secret — only useful to tools (like ws-fanout) that publish as this device. */
  mqttSecret: string;
}

export function seedDevicesAndReadings(
  dbFile: string,
  opts: { userId: string; deviceCount: number; readingsPerDevice: number; intervalSeconds: number },
): SeededDevice[] {
  const { db, sqlite } = createDb({ file: dbFile });
  try {
    const repos: Repositories = createRepositories(db);
    seedSystemPlantProfiles(db);

    const profile = repos.profiles
      .listForUser(opts.userId)
      .find((p) => p.isSystem && p.name === SYSTEM_PLANT_PROFILES[0]!.name);

    const devices: SeededDevice[] = [];
    const now = Date.now();

    for (let i = 0; i < opts.deviceCount; i++) {
      const deviceUid = `loadtest-${i.toString().padStart(4, "0")}-${randomUUID().slice(0, 8)}`;
      const mqttSecret = randomBytes(16).toString("hex");
      const provisioned = repos.devices.provision({
        deviceUid,
        claimCodeHash: sha256(randomBytes(8).toString("hex")),
        claimCodeExpiresAt: now + 365 * 24 * 60 * 60 * 1000,
        mqttSecretHash: sha256(mqttSecret),
      });

      repos.devices.claim(provisioned.id, {
        userId: opts.userId,
        name: `Load Test Device ${i}`,
        location: "lab",
        plantProfileId: profile?.id ?? null,
      });

      repos.configs.create({
        deviceId: provisioned.id,
        thresholds: SYSTEM_PLANT_PROFILES[0]!.thresholds,
        ...DEFAULT_DEVICE_CONFIG,
      });

      const rows = [];
      for (let j = opts.readingsPerDevice - 1; j >= 0; j--) {
        rows.push({
          deviceId: provisioned.id,
          time: now - j * opts.intervalSeconds * 1000,
          soilMoisture: 40 + Math.random() * 20,
          temperature: 26 + Math.random() * 4,
          humidity: 55 + Math.random() * 15,
          waterLevel: 60 + Math.random() * 30,
          waterLevelCm: 18 + Math.random() * 6,
          waterLevelSource: "ultrasonic" as const,
          pumpOn: false,
          status: "NORMAL",
        });
      }
      for (let b = 0; b < rows.length; b += 100) {
        repos.readings.insertBatch(rows.slice(b, b + 100));
      }

      devices.push({ deviceId: provisioned.id, deviceUid, mqttSecret });
    }

    return devices;
  } finally {
    sqlite.close();
  }
}
