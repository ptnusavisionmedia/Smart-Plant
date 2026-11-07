import { randomBytes, createHash } from "node:crypto";
import type { Repositories } from "@smart-plant/db";
import {
  DEFAULT_DEVICE_CONFIG,
  SYSTEM_PLANT_PROFILES,
  OFFLINE_MULTIPLIER,
  type Status,
  type StatusReason,
  type DeviceSummary,
} from "@smart-plant/shared";
import { Errors } from "../errors.js";
import { latestState } from "../realtime/latest-state.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashSecret(value: string): string {
  return sha256(value);
}

export function generateClaimCode(): string {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `SP-${part()}-${part()}`;
}

export function generateMqttSecret(): string {
  return randomBytes(24).toString("hex");
}

type DeviceRow = NonNullable<ReturnType<Repositories["devices"]["findById"]>>;
type ConfigRow = ReturnType<Repositories["configs"]["getByDeviceId"]>;
type StatusEventRow = ReturnType<Repositories["events"]["latestStatusEvent"]>;

function buildSummary(device: DeviceRow, config: ConfigRow, latestStatusEvent: StatusEventRow): DeviceSummary {
  const live = latestState.get(device.id);
  const latest = live ?? null;

  const isOnline =
    device.isOnline &&
    device.lastSeenAt !== null &&
    Date.now() - device.lastSeenAt <= (config?.telemetryIntervalSeconds ?? 30) * 1000 * OFFLINE_MULTIPLIER;

  return {
    id: device.id,
    deviceUid: device.deviceUid,
    name: device.name,
    location: device.location,
    status: (latestStatusEvent?.status as Status) ?? "NORMAL",
    reasons: latestStatusEvent ? (JSON.parse(latestStatusEvent.reasons) as StatusReason[]) : [],
    isOnline,
    lastSeenAt: device.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : null,
    autoMode: device.autoMode,
    emergencyLatched: device.emergencyLatched,
    latest: latest
      ? {
          soilMoisture: latest.soilMoisture,
          temperature: latest.temperature,
          humidity: latest.humidity,
          waterLevel: latest.waterLevel,
          pumpOn: latest.pumpOn,
          ts: new Date(latest.ts).toISOString(),
        }
      : null,
  };
}

export function createDeviceService(repos: Repositories) {
  return {
    /** Factory/provisioning step — not exposed publicly; see tools/provision-device.ts. */
    provisionDevice(deviceUid: string) {
      const claimCode = generateClaimCode();
      const mqttSecret = generateMqttSecret();
      const row = repos.devices.provision({
        deviceUid,
        claimCodeHash: hashSecret(claimCode),
        claimCodeExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        mqttSecretHash: hashSecret(mqttSecret),
      });
      return { device: row, claimCode, mqttSecret };
    },

    claim(userId: string, input: { claimCode: string; name: string; location?: string; plantProfileId?: string }) {
      const device = repos.devices.findUnclaimedByClaimCodeHash(hashSecret(input.claimCode));
      if (!device) throw Errors.badRequest("Kode klaim tidak valid atau sudah kedaluwarsa");

      let profileId: string | null = input.plantProfileId ?? null;
      let thresholds = SYSTEM_PLANT_PROFILES[0]!.thresholds;
      if (profileId) {
        const profile = repos.profiles.getByIdForUser(profileId, userId);
        if (!profile) throw Errors.badRequest("Profil tanaman tidak ditemukan");
        thresholds = JSON.parse(profile.thresholds);
      } else {
        const systemDefault = repos.profiles
          .listForUser(userId)
          .find((p) => p.isSystem && p.name === SYSTEM_PLANT_PROFILES[0]!.name);
        if (systemDefault) {
          profileId = systemDefault.id;
          thresholds = JSON.parse(systemDefault.thresholds);
        }
      }

      repos.devices.claim(device.id, {
        userId,
        name: input.name,
        location: input.location ?? null,
        plantProfileId: profileId,
      });

      repos.configs.create({
        deviceId: device.id,
        thresholds,
        ...DEFAULT_DEVICE_CONFIG,
      });

      repos.audit.log({ userId, deviceId: device.id, action: "device.claim" });

      return repos.devices.findById(device.id)!;
    },

    toSummary(deviceId: string): DeviceSummary {
      const device = repos.devices.findById(deviceId);
      if (!device) throw Errors.notFound("Perangkat tidak ditemukan");

      const config = repos.configs.getByDeviceId(deviceId);
      const latestStatusEvent = repos.events.latestStatusEvent(deviceId);
      return buildSummary(device, config, latestStatusEvent);
    },

    /**
     * Batched to avoid N+1 queries (one config + one status-event lookup per
     * device): a dashboard with 100 devices otherwise issues ~300 queries for
     * a single GET /devices (T-52 found this blowing the p95 <500ms budget).
     */
    listForUser(userId: string): DeviceSummary[] {
      const devices = repos.devices.listForUser(userId);
      if (devices.length === 0) return [];

      const deviceIds = devices.map((d) => d.id);
      const configs = repos.configs.getByDeviceIds(deviceIds);
      const statusEvents = repos.events.latestStatusEventsByDeviceIds(deviceIds);

      return devices.map((device) => buildSummary(device, configs.get(device.id), statusEvents.get(device.id)));
    },

    requireOwned(deviceId: string, userId: string) {
      const device = repos.devices.findByIdForUser(deviceId, userId);
      if (!device) throw Errors.notFound("Perangkat tidak ditemukan");
      return device;
    },

    update(deviceId: string, userId: string, patch: { name?: string; location?: string; plantProfileId?: string }) {
      this.requireOwned(deviceId, userId);
      repos.devices.update(deviceId, patch);
      repos.audit.log({ userId, deviceId, action: "device.update", metadata: patch });
    },

    delete(deviceId: string, userId: string) {
      this.requireOwned(deviceId, userId);
      repos.devices.unclaim(deviceId);
      latestState.delete(deviceId);
      repos.audit.log({ userId, deviceId, action: "device.delete" });
    },
  };
}

export type DeviceService = ReturnType<typeof createDeviceService>;
