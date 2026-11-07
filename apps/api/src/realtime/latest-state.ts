import type { Status, StatusReason } from "@smart-plant/shared";
import type { Repositories } from "@smart-plant/db";

export interface LatestDeviceState {
  deviceId: string;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  waterLevel: number | null;
  pumpOn: boolean;
  status: Status;
  reasons: StatusReason[];
  ts: number;
  isOnline: boolean;
  lastSeenAt: number | null;
  /** Rolling buffer of recent soil readings, oldest-first, for the 3-sample debounce. */
  soilMoistureSamples: Array<number | null>;
}

const MAX_SAMPLES = 10;

/**
 * In-memory latest-state cache (Tech Spec §1/§5): avoids a DB round-trip for
 * the dashboard and for debounce decisions. Hydrated from SQLite on boot.
 */
export class LatestStateStore {
  private readonly state = new Map<string, LatestDeviceState>();

  hydrate(repos: Repositories, deviceIds: string[]) {
    for (const deviceId of deviceIds) {
      const device = repos.devices.findById(deviceId);
      const latest = repos.readings.latestForDevice(deviceId);
      const samples = repos.readings.recentSoilMoistureSamples(deviceId, MAX_SAMPLES);

      this.state.set(deviceId, {
        deviceId,
        soilMoisture: latest?.soilMoisture ?? null,
        temperature: latest?.temperature ?? null,
        humidity: latest?.humidity ?? null,
        waterLevel: latest?.waterLevel ?? null,
        pumpOn: latest?.pumpOn ?? false,
        status: (latest?.status as Status) ?? "NORMAL",
        reasons: [],
        ts: latest?.time ?? Date.now(),
        isOnline: device?.isOnline ?? false,
        lastSeenAt: device?.lastSeenAt ?? null,
        soilMoistureSamples: samples,
      });
    }
  }

  get(deviceId: string): LatestDeviceState | undefined {
    return this.state.get(deviceId);
  }

  update(deviceId: string, patch: Partial<LatestDeviceState>) {
    const current = this.state.get(deviceId);
    const next: LatestDeviceState = {
      deviceId,
      soilMoisture: null,
      temperature: null,
      humidity: null,
      waterLevel: null,
      pumpOn: false,
      status: "NORMAL",
      reasons: [],
      ts: Date.now(),
      isOnline: false,
      lastSeenAt: null,
      soilMoistureSamples: [],
      ...current,
      ...patch,
    };

    if (patch.soilMoisture !== undefined) {
      next.soilMoistureSamples = [...(current?.soilMoistureSamples ?? []), patch.soilMoisture].slice(
        -MAX_SAMPLES,
      );
    }

    this.state.set(deviceId, next);
    return next;
  }

  delete(deviceId: string) {
    this.state.delete(deviceId);
  }
}

export const latestState = new LatestStateStore();
