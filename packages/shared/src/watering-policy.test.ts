import { describe, expect, it } from "vitest";
import {
  canStartAutoWatering,
  isCooldownActive,
  isDeviceOnline,
  isSoilPersistentlyLow,
  isWaterSafe,
  shouldStopPump,
  validateManualWatering,
  type AutoWateringContext,
} from "./watering-policy.js";
import type { DeviceConfig } from "./schemas/config.js";

const thresholds: DeviceConfig["thresholds"] = {
  soil: { criticalLow: 25, warningLow: 40, warningHigh: 71, criticalHigh: 85 },
  temp: { criticalLow: 15, warningLow: 18, warningHigh: 31, criticalHigh: 35 },
  humidity: { criticalLow: 40, warningLow: 50, warningHigh: 71, criticalHigh: 80 },
  water: { warningLow: 30, criticalLow: 15 },
};

function baseAutoCtx(overrides: Partial<AutoWateringContext> = {}): AutoWateringContext {
  return {
    autoMode: true,
    emergencyLatched: false,
    configAccepted: true,
    water: { waterLevel: 60, waterLevelSource: "ultrasonic", thresholds },
    soilMoistureSamples: [35, 35, 35],
    thresholds,
    lastWateringEndedAt: null,
    cooldownSeconds: 1800,
    now: 1_000_000,
    ...overrides,
  };
}

describe("isWaterSafe", () => {
  it("is unsafe when the ultrasonic reading is null (fail-safe)", () => {
    expect(
      isWaterSafe({ waterLevel: null, waterLevelSource: "ultrasonic", thresholds }),
    ).toBe(false);
  });
  it("is unsafe below criticalLow", () => {
    expect(
      isWaterSafe({ waterLevel: 14, waterLevelSource: "ultrasonic", thresholds }),
    ).toBe(false);
  });
  it("is safe at exactly criticalLow", () => {
    expect(
      isWaterSafe({ waterLevel: 15, waterLevelSource: "ultrasonic", thresholds }),
    ).toBe(true);
  });
  it("float switch is authoritative over the ultrasonic reading", () => {
    expect(
      isWaterSafe({
        waterLevel: 90,
        waterLevelSource: "float_switch",
        floatSwitchLow: true,
        thresholds,
      }),
    ).toBe(false);
  });
});

describe("isSoilPersistentlyLow (debounce)", () => {
  it("requires 3 consecutive samples at or below warningLow", () => {
    expect(isSoilPersistentlyLow([50, 35, 35], 40)).toBe(false); // only 2 of the last 3
    expect(isSoilPersistentlyLow([35, 35, 35], 40)).toBe(true);
    expect(isSoilPersistentlyLow([35, 35], 40)).toBe(false); // not enough samples yet
  });
  it("a null sample breaks the debounce streak", () => {
    expect(isSoilPersistentlyLow([35, null, 35], 40)).toBe(false);
  });
});

describe("isCooldownActive", () => {
  it("is false when the device has never watered", () => {
    expect(isCooldownActive(null, 1800, 1_000_000)).toBe(false);
  });
  it("is true immediately after watering ends", () => {
    expect(isCooldownActive(1_000_000, 1800, 1_000_000 + 1000)).toBe(true);
  });
  it("is false once the cooldown window has elapsed", () => {
    expect(isCooldownActive(0, 1800, 1800 * 1000 + 1)).toBe(false);
  });
});

describe("isDeviceOnline", () => {
  it("is offline once last_seen exceeds 3x the telemetry interval", () => {
    expect(isDeviceOnline(0, 30, 30_000 * 3 + 1)).toBe(false);
  });
  it("is online within 3x the telemetry interval", () => {
    expect(isDeviceOnline(0, 30, 30_000 * 3)).toBe(true);
  });
});

describe("canStartAutoWatering", () => {
  it("allows watering when every condition is met", () => {
    expect(canStartAutoWatering(baseAutoCtx())).toEqual({ allowed: true });
  });
  it("rejects when auto mode is off", () => {
    expect(canStartAutoWatering(baseAutoCtx({ autoMode: false }))).toEqual({
      allowed: false,
      reason: "AUTO_MODE_OFF",
    });
  });
  it("rejects when the config has never been accepted by the firmware", () => {
    expect(canStartAutoWatering(baseAutoCtx({ configAccepted: false }))).toEqual({
      allowed: false,
      reason: "CONFIG_NOT_ACCEPTED",
    });
  });
  it("rejects when emergency is latched", () => {
    expect(canStartAutoWatering(baseAutoCtx({ emergencyLatched: true }))).toEqual({
      allowed: false,
      reason: "EMERGENCY_STOP",
    });
  });
  it("rejects when water is low", () => {
    expect(
      canStartAutoWatering(
        baseAutoCtx({ water: { waterLevel: 5, waterLevelSource: "ultrasonic", thresholds } }),
      ),
    ).toEqual({ allowed: false, reason: "WATER_LOW" });
  });
  it("rejects when soil has not been persistently low for 3 samples", () => {
    expect(canStartAutoWatering(baseAutoCtx({ soilMoistureSamples: [60, 60, 35] }))).toEqual({
      allowed: false,
      reason: "SOIL_NOT_LOW",
    });
  });
  it("rejects while cooldown is active", () => {
    expect(
      canStartAutoWatering(baseAutoCtx({ lastWateringEndedAt: 999_900, now: 1_000_000 })),
    ).toEqual({ allowed: false, reason: "COOLDOWN_ACTIVE" });
  });
});

describe("shouldStopPump", () => {
  const base = {
    currentSoilMoisture: 40,
    targetMoisture: 55,
    pumpElapsedSeconds: 10,
    maxPumpSeconds: 60,
    water: { waterLevel: 60, waterLevelSource: "ultrasonic" as const, thresholds },
    emergencyLatched: false,
  };

  it("keeps running when nothing has been reached", () => {
    expect(shouldStopPump(base)).toEqual({ stop: false });
  });
  it("stops at the target moisture", () => {
    expect(shouldStopPump({ ...base, currentSoilMoisture: 55 })).toEqual({
      stop: true,
      reason: "TARGET_REACHED",
    });
  });
  it("stops at the max duration (60s)", () => {
    expect(shouldStopPump({ ...base, pumpElapsedSeconds: 60 })).toEqual({
      stop: true,
      reason: "MAX_DURATION_REACHED",
    });
  });
  it("stops immediately when water goes low", () => {
    expect(
      shouldStopPump({
        ...base,
        water: { waterLevel: 5, waterLevelSource: "ultrasonic", thresholds },
      }),
    ).toEqual({ stop: true, reason: "WATER_LOW" });
  });
  it("stops immediately on emergency latch", () => {
    expect(shouldStopPump({ ...base, emergencyLatched: true })).toEqual({
      stop: true,
      reason: "EMERGENCY_STOP",
    });
  });
  it("stops on an explicit manual stop request, taking priority over everything else", () => {
    expect(shouldStopPump({ ...base, manualStopRequested: true })).toEqual({
      stop: true,
      reason: "MANUAL_STOP",
    });
  });
});

describe("validateManualWatering", () => {
  const base = {
    durationSeconds: 10,
    maxPumpSeconds: 60,
    emergencyLatched: false,
    water: { waterLevel: 60, waterLevelSource: "ultrasonic" as const, thresholds },
    isOnline: true,
  };

  it("allows a valid request", () => {
    expect(validateManualWatering(base)).toEqual({ allowed: true });
  });
  it("rejects a duration above maxPumpSeconds", () => {
    expect(validateManualWatering({ ...base, durationSeconds: 61 })).toEqual({
      allowed: false,
      reason: "INVALID_DURATION",
    });
  });
  it("rejects when the device is offline", () => {
    expect(validateManualWatering({ ...base, isOnline: false })).toEqual({
      allowed: false,
      reason: "DEVICE_OFFLINE",
    });
  });
  it("rejects when emergency is latched", () => {
    expect(validateManualWatering({ ...base, emergencyLatched: true })).toEqual({
      allowed: false,
      reason: "EMERGENCY_STOP",
    });
  });
  it("rejects when water is low", () => {
    expect(
      validateManualWatering({
        ...base,
        water: { waterLevel: 5, waterLevelSource: "ultrasonic", thresholds },
      }),
    ).toEqual({ allowed: false, reason: "WATER_LOW" });
  });
});
