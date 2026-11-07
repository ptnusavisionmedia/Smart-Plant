import type { Thresholds } from "./schemas/config.js";
import type { Status, StatusReason } from "./schemas/status.js";

export interface SensorReadingInput {
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  waterLevel: number | null;
}

export interface StatusEvaluation {
  status: Status;
  reasons: StatusReason[];
}

/**
 * Pure status evaluation per Tech Spec §4.3. Priority: CRITICAL > WATER_LOW >
 * WARNING > NORMAL. A null sensor reading means the sensor failed to read; it
 * is always reported via the SENSOR_ERROR reason and status is never
 * downgraded to NORMAL just because data is missing (promoted to at least
 * WARNING). waterLevel=null is additionally treated as WATER_LOW — the same
 * fail-safe the firmware applies when the ultrasonic echo times out 3x.
 */
export function evaluateStatus(reading: SensorReadingInput, thresholds: Thresholds): StatusEvaluation {
  const reasons: StatusReason[] = [];
  let critical = false;
  let warning = false;
  let sensorError = false;

  // Soil moisture
  if (reading.soilMoisture === null) {
    sensorError = true;
  } else if (reading.soilMoisture < thresholds.soil.criticalLow) {
    critical = true;
    reasons.push("SOIL_CRITICAL_DRY");
  } else if (reading.soilMoisture > thresholds.soil.criticalHigh) {
    critical = true;
    reasons.push("SOIL_CRITICAL_WET");
  } else if (reading.soilMoisture < thresholds.soil.warningLow) {
    warning = true;
    reasons.push("SOIL_WARNING_DRY");
  } else if (reading.soilMoisture > thresholds.soil.warningHigh) {
    warning = true;
    reasons.push("SOIL_WARNING_WET");
  }

  // Temperature
  if (reading.temperature === null) {
    sensorError = true;
  } else if (reading.temperature < thresholds.temp.criticalLow) {
    critical = true;
    reasons.push("TEMP_CRITICAL_LOW");
  } else if (reading.temperature > thresholds.temp.criticalHigh) {
    critical = true;
    reasons.push("TEMP_CRITICAL_HIGH");
  } else if (reading.temperature < thresholds.temp.warningLow) {
    warning = true;
    reasons.push("TEMP_WARNING_LOW");
  } else if (reading.temperature > thresholds.temp.warningHigh) {
    warning = true;
    reasons.push("TEMP_WARNING_HIGH");
  }

  // Humidity
  if (reading.humidity === null) {
    sensorError = true;
  } else if (reading.humidity < thresholds.humidity.criticalLow) {
    critical = true;
    reasons.push("HUMIDITY_CRITICAL_LOW");
  } else if (reading.humidity > thresholds.humidity.criticalHigh) {
    critical = true;
    reasons.push("HUMIDITY_CRITICAL_HIGH");
  } else if (reading.humidity < thresholds.humidity.warningLow) {
    warning = true;
    reasons.push("HUMIDITY_WARNING_LOW");
  } else if (reading.humidity > thresholds.humidity.warningHigh) {
    warning = true;
    reasons.push("HUMIDITY_WARNING_HIGH");
  }

  // Water level: a failed read (null) is fail-safe-equivalent to WATER_LOW so
  // the pump stays blocked (see watering-policy.ts) and the user is alerted.
  const waterLow =
    reading.waterLevel === null || reading.waterLevel < thresholds.water.criticalLow;
  if (reading.waterLevel === null) {
    sensorError = true;
  }
  if (waterLow) {
    reasons.push("WATER_LOW");
  }

  if (sensorError) {
    reasons.push("SENSOR_ERROR");
  }

  let status: Status;
  if (critical) {
    status = "CRITICAL";
  } else if (waterLow) {
    status = "WATER_LOW";
  } else if (warning || sensorError) {
    status = "WARNING";
  } else {
    status = "NORMAL";
  }

  return { status, reasons };
}
