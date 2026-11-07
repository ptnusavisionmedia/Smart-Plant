import type { DeviceConfig } from "./schemas/config.js";
import { DEBOUNCE_SAMPLE_COUNT, OFFLINE_MULTIPLIER } from "./constants.js";

export type WateringRejectReason =
  | "WATER_LOW"
  | "EMERGENCY_STOP"
  | "DEVICE_OFFLINE"
  | "CONFIG_NOT_ACCEPTED"
  | "AUTO_MODE_OFF"
  | "COOLDOWN_ACTIVE"
  | "SOIL_NOT_LOW"
  | "INVALID_DURATION";

export type PumpStopReason =
  | "TARGET_REACHED"
  | "MAX_DURATION_REACHED"
  | "WATER_LOW"
  | "EMERGENCY_STOP"
  | "MANUAL_STOP";

export interface WaterSafetyContext {
  /** Most recent water level percentage, or null if the sensor failed to read. */
  waterLevel: number | null;
  waterLevelSource: DeviceConfig["waterLevelSource"];
  /** Only meaningful when waterLevelSource === "float_switch"; true means water is below the float switch. */
  floatSwitchLow?: boolean;
  thresholds: Pick<DeviceConfig["thresholds"], "water">;
}

/**
 * Whether it is safe to run the pump right now. A float switch, when present,
 * is authoritative over the ultrasonic reading (Tech Spec §4.10). A failed
 * sensor read (null) is never treated as "safe" — fail-safe blocks the pump.
 */
export function isWaterSafe(ctx: WaterSafetyContext): boolean {
  if (ctx.waterLevelSource === "float_switch" && ctx.floatSwitchLow !== undefined) {
    return !ctx.floatSwitchLow;
  }
  if (ctx.waterLevel === null) return false;
  return ctx.waterLevel >= ctx.thresholds.water.criticalLow;
}

/**
 * True once the last DEBOUNCE_SAMPLE_COUNT consecutive soil readings are all
 * at or below warningLow (samples ordered oldest-first, newest last).
 */
export function isSoilPersistentlyLow(
  soilMoistureSamples: ReadonlyArray<number | null>,
  warningLow: number,
  sampleCount: number = DEBOUNCE_SAMPLE_COUNT,
): boolean {
  if (soilMoistureSamples.length < sampleCount) return false;
  const recent = soilMoistureSamples.slice(-sampleCount);
  return recent.every((v) => v !== null && v <= warningLow);
}

export function isCooldownActive(
  lastWateringEndedAt: number | null,
  cooldownSeconds: number,
  now: number,
): boolean {
  if (lastWateringEndedAt === null) return false;
  return now - lastWateringEndedAt < cooldownSeconds * 1000;
}

export function isDeviceOnline(
  lastSeenAt: number | null,
  telemetryIntervalSeconds: number,
  now: number,
  multiplier: number = OFFLINE_MULTIPLIER,
): boolean {
  if (lastSeenAt === null) return false;
  return now - lastSeenAt <= telemetryIntervalSeconds * 1000 * multiplier;
}

export interface AutoWateringContext {
  autoMode: boolean;
  emergencyLatched: boolean;
  /** False until the firmware has acknowledged a valid config at least once (§4.4 step 8). */
  configAccepted: boolean;
  water: WaterSafetyContext;
  soilMoistureSamples: ReadonlyArray<number | null>;
  thresholds: DeviceConfig["thresholds"];
  lastWateringEndedAt: number | null;
  cooldownSeconds: number;
  now: number;
}

export interface WateringDecision {
  allowed: boolean;
  reason?: WateringRejectReason;
}

/** Mirrors the firmware's local auto-watering decision (Tech Spec §4.4, steps 1-4). */
export function canStartAutoWatering(ctx: AutoWateringContext): WateringDecision {
  if (!ctx.configAccepted) return { allowed: false, reason: "CONFIG_NOT_ACCEPTED" };
  if (!ctx.autoMode) return { allowed: false, reason: "AUTO_MODE_OFF" };
  if (ctx.emergencyLatched) return { allowed: false, reason: "EMERGENCY_STOP" };
  if (!isWaterSafe(ctx.water)) return { allowed: false, reason: "WATER_LOW" };
  if (!isSoilPersistentlyLow(ctx.soilMoistureSamples, ctx.thresholds.soil.warningLow)) {
    return { allowed: false, reason: "SOIL_NOT_LOW" };
  }
  if (isCooldownActive(ctx.lastWateringEndedAt, ctx.cooldownSeconds, ctx.now)) {
    return { allowed: false, reason: "COOLDOWN_ACTIVE" };
  }
  return { allowed: true };
}

export interface PumpRunningContext {
  currentSoilMoisture: number | null;
  targetMoisture: number;
  pumpElapsedSeconds: number;
  maxPumpSeconds: number;
  water: WaterSafetyContext;
  emergencyLatched: boolean;
  manualStopRequested?: boolean;
}

export interface PumpStopDecision {
  stop: boolean;
  reason?: PumpStopReason;
}

/** Mirrors the firmware's local pump-stop decision (Tech Spec §4.4, step 6). */
export function shouldStopPump(ctx: PumpRunningContext): PumpStopDecision {
  if (ctx.manualStopRequested) return { stop: true, reason: "MANUAL_STOP" };
  if (ctx.emergencyLatched) return { stop: true, reason: "EMERGENCY_STOP" };
  if (!isWaterSafe(ctx.water)) return { stop: true, reason: "WATER_LOW" };
  if (ctx.pumpElapsedSeconds >= ctx.maxPumpSeconds) {
    return { stop: true, reason: "MAX_DURATION_REACHED" };
  }
  if (ctx.currentSoilMoisture !== null && ctx.currentSoilMoisture >= ctx.targetMoisture) {
    return { stop: true, reason: "TARGET_REACHED" };
  }
  return { stop: false };
}

export interface ManualWateringContext {
  durationSeconds: number;
  maxPumpSeconds: number;
  emergencyLatched: boolean;
  water: WaterSafetyContext;
  isOnline: boolean;
}

/** Mirrors the API's pre-publish checks for POST /devices/:id/watering (Tech Spec §4.5, step 3). */
export function validateManualWatering(ctx: ManualWateringContext): WateringDecision {
  if (ctx.durationSeconds < 1 || ctx.durationSeconds > ctx.maxPumpSeconds) {
    return { allowed: false, reason: "INVALID_DURATION" };
  }
  if (!ctx.isOnline) return { allowed: false, reason: "DEVICE_OFFLINE" };
  if (ctx.emergencyLatched) return { allowed: false, reason: "EMERGENCY_STOP" };
  if (!isWaterSafe(ctx.water)) return { allowed: false, reason: "WATER_LOW" };
  return { allowed: true };
}
