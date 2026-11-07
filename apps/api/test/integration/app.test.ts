import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, createRepositories, seedSystemPlantProfiles } from "@smart-plant/db";
import { SYSTEM_PLANT_PROFILES, DEFAULT_DEVICE_CONFIG } from "@smart-plant/shared";
import type { FastifyInstance } from "fastify";

/**
 * Integration test (T-50) — exercises the real Fastify app via `.inject()`
 * (no real HTTP socket, no real MQTT broker needed) against a real,
 * migrated, on-disk SQLite file. Covers the auth flow, the device-ownership
 * isolation check, the GET /devices batch-query path (T-52 found and fixed
 * an N+1 there), config updates, the internal MQTT auth/ACL endpoints, and
 * a synchronous watering-policy rejection path.
 *
 * What this does NOT cover (needs a live broker, not available in this
 * sandbox — see `docs/performance.md` and `tools/loadtest/README.md`):
 * real device telemetry ingestion, WebSocket fan-out, and the Telegram bot.
 */

let app: FastifyInstance;
let workDir: string;

// The register/login rate limiter is per-IP (5/minute, by design — see
// docs/provisioning.md). Each distinct test "user" gets its own fake
// remoteAddress, the same way different real users would, so this test
// file's own auth traffic doesn't trip a limiter meant for one abusive IP.
function fakeIpFor(email: string): string {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `10.${hash % 250}.${(hash >> 8) % 250}.${(hash >> 16) % 250}`;
}

async function register(email: string, password = "Password123!") {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    remoteAddress: fakeIpFor(email),
    payload: { name: "Test User", email, password },
  });
  return res;
}

async function login(email: string, password = "Password123!") {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    remoteAddress: fakeIpFor(email),
    payload: { email, password },
  });
  return res.json<{ accessToken: string }>().accessToken;
}

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), "sp-api-integration-"));
  const dbFile = join(workDir, "test.db");

  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.DATABASE_FILE = dbFile;
  process.env.JWT_ACCESS_SECRET = "a".repeat(32);
  process.env.JWT_REFRESH_SECRET = "b".repeat(32);
  process.env.INTERNAL_MQTT_SHARED_SECRET = "internal-test-secret";
  process.env.MQTT_URL = "mqtt://127.0.0.1:1"; // deliberately unreachable, see server-harness.ts for why this is safe
  process.env.MQTT_BRIDGE_USERNAME = "api-bridge";
  process.env.MQTT_BRIDGE_PASSWORD = "bridge-test-password";
  process.env.TELEGRAM_MODE = "disabled";
  process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";

  const migrationsFolder = fileURLToPath(new URL("../../../../packages/db/migrations", import.meta.url));
  const { db, sqlite } = createDb({ file: dbFile });
  migrate(db, { migrationsFolder });
  sqlite.close();

  const { buildApp } = await import("../../src/app.js");
  app = await buildApp();
}, 30_000);

afterAll(async () => {
  await app.close();
  rmSync(workDir, { recursive: true, force: true });
});

describe("auth", () => {
  const email = `auth-${Date.now()}@example.invalid`;

  it("registers a new user", async () => {
    const res = await register(email);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: email.toLowerCase(), emailVerified: false });
  });

  it("rejects a duplicate email", async () => {
    const res = await register(email);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("EMAIL_TAKEN");
  });

  it("rejects a wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: fakeIpFor(email),
      payload: { email, password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("logs in and fetches /me with the access token", async () => {
    const token = await login(email);
    expect(token).toBeTruthy();

    const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(email.toLowerCase());
  });

  it("rejects a request with no token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/devices" });
    expect(res.statusCode).toBe(401);
  });
});

describe("devices", () => {
  const ownerEmail = `owner-${Date.now()}@example.invalid`;
  const otherEmail = `other-${Date.now()}@example.invalid`;
  let ownerToken: string;
  let otherToken: string;
  let deviceId: string;

  beforeAll(async () => {
    await register(ownerEmail);
    await register(otherEmail);
    ownerToken = await login(ownerEmail);
    otherToken = await login(otherEmail);

    // Seed a claimed device directly through the repositories — claiming
    // over HTTP is rate-limited to 5/hour/user by design (see
    // docs/provisioning.md), so tests that don't exercise that limiter
    // itself seed fixtures the same way tools/loadtest does.
    const { db, sqlite } = createDb({ file: process.env.DATABASE_FILE! });
    const repos = createRepositories(db);
    seedSystemPlantProfiles(db);
    const user = repos.users.findByEmail(ownerEmail)!;
    const profile = repos.profiles.listForUser(user.id).find((p) => p.isSystem)!;
    const provisioned = repos.devices.provision({
      deviceUid: "integration-test-device",
      claimCodeHash: "unused-hash",
      claimCodeExpiresAt: Date.now() + 60_000,
      mqttSecretHash: "unused-secret-hash",
    });
    repos.devices.claim(provisioned.id, { userId: user.id, name: "Test Device", location: null, plantProfileId: profile.id });
    repos.configs.create({ deviceId: provisioned.id, thresholds: SYSTEM_PLANT_PROFILES[0]!.thresholds, ...DEFAULT_DEVICE_CONFIG });
    deviceId = provisioned.id;
    sqlite.close();
  });

  it("lists only the owner's devices", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/devices", headers: { authorization: `Bearer ${ownerToken}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: Array<{ id: string }> }>();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]!.id).toBe(deviceId);
  });

  it("another user sees no devices (batched list query stays scoped per-user)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/devices", headers: { authorization: `Bearer ${otherToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ items: unknown[] }>().items).toHaveLength(0);
  });

  it("the owner can fetch the device by id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/devices/${deviceId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(deviceId);
  });

  it("a non-owner gets 404, not someone else's device data (BOLA check)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/devices/${deviceId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("updates device config and merges thresholds without clobbering unspecified fields", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/devices/${deviceId}/config`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { targetMoisture: 65 },
    });
    expect(res.statusCode).toBe(200);
    const config = res.json();
    expect(config.targetMoisture).toBe(65);
    expect(config.thresholds).toEqual(SYSTEM_PLANT_PROFILES[0]!.thresholds);
  });

  it("rejects manual watering on a device that has never reported in (DEVICE_OFFLINE)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/devices/${deviceId}/watering`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("DEVICE_OFFLINE");
  });
});

describe("internal MQTT auth/ACL (mosquitto-go-auth backend)", () => {
  const secretQuery = "secret=internal-test-secret";

  it("rejects everything without the internal shared secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/internal/mqtt/auth",
      payload: { username: "api-bridge", password: "bridge-test-password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts the bridge account with the right password", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/internal/mqtt/auth?${secretQuery}`,
      payload: { username: "api-bridge", password: "bridge-test-password" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects the bridge account with the wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/internal/mqtt/auth?${secretQuery}`,
      payload: { username: "api-bridge", password: "wrong" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an unknown device", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/internal/mqtt/auth?${secretQuery}`,
      payload: { username: "no-such-device", password: "x" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("ACL allows a device only on its own topic prefix", async () => {
    const own = await app.inject({
      method: "POST",
      url: `/api/v1/internal/mqtt/acl?${secretQuery}`,
      payload: { username: "integration-test-device", topic: "sp/integration-test-device/telemetry", acc: 1 },
    });
    expect(own.statusCode).toBe(200);

    const crossDevice = await app.inject({
      method: "POST",
      url: `/api/v1/internal/mqtt/acl?${secretQuery}`,
      payload: { username: "integration-test-device", topic: "sp/some-other-device/telemetry", acc: 1 },
    });
    expect(crossDevice.statusCode).toBe(403);
  });
});
