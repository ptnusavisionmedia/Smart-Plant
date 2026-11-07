import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "../client.js";
import { createRepositories, type Repositories } from "./index.js";
import { SYSTEM_PLANT_PROFILES } from "@smart-plant/shared";
import { seedSystemPlantProfiles } from "../seed.js";

let db: Db;
let repos: Repositories;

beforeEach(() => {
  const created = createDb({ file: ":memory:" });
  db = created.db;
  const migrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));
  migrate(db, { migrationsFolder });
  seedSystemPlantProfiles(db);
  repos = createRepositories(db);
});

const thresholds = SYSTEM_PLANT_PROFILES[0]!.thresholds;

function makeDevice() {
  const device = repos.devices.provision({
    deviceUid: "esp32-test-1",
    claimCodeHash: "hashed-code",
    claimCodeExpiresAt: Date.now() + 60_000,
    mqttSecretHash: "hashed-secret",
  });
  return device;
}

describe("users repository", () => {
  it("creates a user and finds it by email, case-insensitively", () => {
    repos.users.create({ name: "Budi", email: "Budi@Example.com", passwordHash: "hash" });
    const found = repos.users.findByEmail("budi@example.com");
    expect(found?.name).toBe("Budi");
  });

  it("session lifecycle: create, find active, revoke", () => {
    const user = repos.users.create({ name: "Siti", email: "siti@example.com", passwordHash: "hash" });
    const session = repos.users.createSession({
      userId: user.id,
      refreshTokenHash: "rt-hash",
      expiresAt: Date.now() + 1000,
    });
    expect(repos.users.findActiveSessionByHash("rt-hash")).toBeDefined();
    repos.users.revokeSession(session.id);
    expect(repos.users.findActiveSessionByHash("rt-hash")).toBeUndefined();
  });
});

describe("devices repository", () => {
  it("provisions a device unclaimed, then claims it for a user", () => {
    const device = makeDevice();
    expect(device.userId).toBeNull();

    const user = repos.users.create({ name: "Owner", email: "owner@example.com", passwordHash: "x" });
    const found = repos.devices.findUnclaimedByClaimCodeHash("hashed-code");
    expect(found?.id).toBe(device.id);

    repos.devices.claim(device.id, { userId: user.id, name: "Monstera", location: "Ruang Tamu", plantProfileId: null });

    const claimed = repos.devices.findByIdForUser(device.id, user.id);
    expect(claimed?.name).toBe("Monstera");
    expect(claimed?.claimCodeHash).toBeNull();

    // Scoped lookup for a different user must not find it.
    expect(repos.devices.findByIdForUser(device.id, "someone-else")).toBeUndefined();
  });

  it("tracks presence and emergency latch", () => {
    const device = makeDevice();
    repos.devices.setPresence(device.id, true, Date.now());
    expect(repos.devices.findById(device.id)?.isOnline).toBe(true);

    repos.devices.setAutoMode(device.id, true);
    repos.devices.setEmergencyLatched(device.id, true);
    const after = repos.devices.findById(device.id)!;
    expect(after.emergencyLatched).toBe(true);
    expect(after.autoMode).toBe(false); // emergency forces auto mode off
  });
});

describe("configs repository", () => {
  it("creates, reads, and updates a config, bumping configVersion", () => {
    const device = makeDevice();
    repos.configs.create({
      deviceId: device.id,
      thresholds,
      targetMoisture: 55,
      maxPumpSeconds: 60,
      cooldownSeconds: 1800,
      telemetryIntervalSeconds: 30,
      waterLevelSource: "ultrasonic",
      tankHeightCm: 30,
      tankMaxLevelCm: 25,
      configVersion: 1,
    });

    const initial = repos.configs.getByDeviceId(device.id);
    expect(initial?.configVersion).toBe(1);

    const updated = repos.configs.update(device.id, { targetMoisture: 60 });
    expect(updated.configVersion).toBe(2);
    expect(updated.targetMoisture).toBe(60);

    const raw = repos.configs.getRawByDeviceId(device.id);
    expect(raw?.acceptedAt).toBeNull();
    repos.configs.markAccepted(device.id, 2);
    expect(repos.configs.getRawByDeviceId(device.id)?.acceptedAt).not.toBeNull();
  });
});

describe("readings repository", () => {
  it("batch inserts readings and returns the latest + recent samples in order", () => {
    const device = makeDevice();
    const now = Date.now();
    repos.readings.insertBatch([
      { deviceId: device.id, time: now - 2000, soilMoisture: 60, temperature: 25, humidity: 60, waterLevel: 70, waterLevelCm: 20, waterLevelSource: "ultrasonic", pumpOn: false, status: "NORMAL" },
      { deviceId: device.id, time: now - 1000, soilMoisture: 50, temperature: 25, humidity: 60, waterLevel: 70, waterLevelCm: 20, waterLevelSource: "ultrasonic", pumpOn: false, status: "NORMAL" },
      { deviceId: device.id, time: now, soilMoisture: 35, temperature: 25, humidity: 60, waterLevel: 70, waterLevelCm: 20, waterLevelSource: "ultrasonic", pumpOn: false, status: "WARNING" },
    ]);

    const latest = repos.readings.latestForDevice(device.id);
    expect(latest?.soilMoisture).toBe(35);

    const samples = repos.readings.recentSoilMoistureSamples(device.id, 3);
    expect(samples).toEqual([60, 50, 35]); // oldest first
  });
});

describe("events repository", () => {
  it("starts and closes a watering event, computing duration", () => {
    const device = makeDevice();
    const started = repos.events.startWatering({ deviceId: device.id, trigger: "manual", commandId: "cmd-1" });
    expect(started.status).toBe("running");

    const closed = repos.events.closeWatering(started.id, "completed");
    expect(closed?.status).toBe("completed");
    expect(closed?.durationSeconds).toBeGreaterThanOrEqual(0);

    expect(repos.events.lastCompletedEndTime(device.id)).toBe(closed?.endedAt);
  });

  it("records and lists status events newest first", () => {
    const device = makeDevice();
    repos.events.insertStatusEvent({ deviceId: device.id, status: "NORMAL", reasons: [] });
    repos.events.insertStatusEvent({ deviceId: device.id, status: "WARNING", reasons: ["SOIL_WARNING_DRY"] });
    const list = repos.events.listStatusEvents(device.id);
    expect(list[0]?.status).toBe("WARNING");
  });
});

describe("notifications repository", () => {
  it("creates notifications, tracks unread count, and marks read", () => {
    const user = repos.users.create({ name: "N", email: "n@example.com", passwordHash: "x" });
    repos.notifications.create({ userId: user.id, deviceId: null, type: "STATUS_CHANGE", title: "t", body: "b", reasons: [] });
    repos.notifications.create({ userId: user.id, deviceId: null, type: "STATUS_CHANGE", title: "t2", body: "b2", reasons: [] });

    expect(repos.notifications.unreadCount(user.id)).toBe(2);
    const { items } = repos.notifications.listForUser(user.id, null, 10);
    repos.notifications.markRead(items[0]!.id, user.id);
    expect(repos.notifications.unreadCount(user.id)).toBe(1);

    repos.notifications.markAllRead(user.id);
    expect(repos.notifications.unreadCount(user.id)).toBe(0);
  });

  it("manages notification preferences with upsert semantics", () => {
    const user = repos.users.create({ name: "P", email: "p@example.com", passwordHash: "x" });
    repos.notifications.upsertPreferences(user.id, { push: false });
    const prefs = repos.notifications.getPreferences(user.id);
    expect(prefs?.push).toBe(false);
    expect(prefs?.inApp).toBe(true);
  });
});

describe("profiles repository", () => {
  it("lists system profiles plus a user's own custom profile", () => {
    const user = repos.users.create({ name: "U", email: "u@example.com", passwordHash: "x" });
    repos.profiles.create({ ownerUserId: user.id, name: "Kebun Saya", thresholds });

    const list = repos.profiles.listForUser(user.id);
    expect(list.some((p) => p.isSystem)).toBe(true);
    expect(list.some((p) => p.name === "Kebun Saya")).toBe(true);
  });

  it("refuses to update a system profile", () => {
    const user = repos.users.create({ name: "U2", email: "u2@example.com", passwordHash: "x" });
    const systemProfiles = repos.profiles.listForUser(user.id).filter((p) => p.isSystem);
    expect(() => repos.profiles.update(systemProfiles[0]!.id, user.id, { name: "Hacked" })).toThrow();
  });
});
