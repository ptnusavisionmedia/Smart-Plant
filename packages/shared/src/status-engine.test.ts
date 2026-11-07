import { describe, expect, it } from "vitest";
import { evaluateStatus, type SensorReadingInput } from "./status-engine.js";
import type { Thresholds } from "./schemas/config.js";

const thresholds: Thresholds = {
  soil: { criticalLow: 25, warningLow: 40, warningHigh: 71, criticalHigh: 85 },
  temp: { criticalLow: 15, warningLow: 18, warningHigh: 31, criticalHigh: 35 },
  humidity: { criticalLow: 40, warningLow: 50, warningHigh: 71, criticalHigh: 80 },
  water: { warningLow: 30, criticalLow: 15 },
};

const baseline: SensorReadingInput = {
  soilMoisture: 55,
  temperature: 25,
  humidity: 60,
  waterLevel: 60,
};

describe("evaluateStatus — baseline", () => {
  it("is NORMAL when every sensor is comfortably within range", () => {
    expect(evaluateStatus(baseline, thresholds)).toEqual({ status: "NORMAL", reasons: [] });
  });
});

describe("evaluateStatus — soil moisture boundaries (25/40/71/85)", () => {
  it("24 is CRITICAL (below criticalLow)", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 24 }, thresholds);
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("SOIL_CRITICAL_DRY");
  });
  it("25 (== criticalLow) is WARNING, not CRITICAL", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 25 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("SOIL_WARNING_DRY");
  });
  it("39 is WARNING (below warningLow)", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 39 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("SOIL_WARNING_DRY");
  });
  it("40 (== warningLow) is NORMAL", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 40 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
  it("71 (== warningHigh) is NORMAL", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 71 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
  it("72 is WARNING (above warningHigh)", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 72 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("SOIL_WARNING_WET");
  });
  it("85 (== criticalHigh) is still WARNING, not CRITICAL", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 85 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("SOIL_WARNING_WET");
  });
  it("86 is CRITICAL (above criticalHigh)", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: 86 }, thresholds);
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("SOIL_CRITICAL_WET");
  });
});

describe("evaluateStatus — temperature boundaries (15/18/31/35)", () => {
  it("14 is CRITICAL (below criticalLow)", () => {
    const r = evaluateStatus({ ...baseline, temperature: 14 }, thresholds);
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("TEMP_CRITICAL_LOW");
  });
  it("15 (== criticalLow) is WARNING", () => {
    const r = evaluateStatus({ ...baseline, temperature: 15 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("TEMP_WARNING_LOW");
  });
  it("17 is WARNING (below warningLow)", () => {
    const r = evaluateStatus({ ...baseline, temperature: 17 }, thresholds);
    expect(r.status).toBe("WARNING");
  });
  it("18 (== warningLow) is NORMAL", () => {
    const r = evaluateStatus({ ...baseline, temperature: 18 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
  it("31 (== warningHigh) is NORMAL", () => {
    const r = evaluateStatus({ ...baseline, temperature: 31 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
  it("32 is WARNING (above warningHigh)", () => {
    const r = evaluateStatus({ ...baseline, temperature: 32 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("TEMP_WARNING_HIGH");
  });
  it("35 (== criticalHigh) is still WARNING", () => {
    const r = evaluateStatus({ ...baseline, temperature: 35 }, thresholds);
    expect(r.status).toBe("WARNING");
  });
  it("36 is CRITICAL (above criticalHigh)", () => {
    const r = evaluateStatus({ ...baseline, temperature: 36 }, thresholds);
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("TEMP_CRITICAL_HIGH");
  });
});

describe("evaluateStatus — humidity boundaries (40/50/71/80)", () => {
  it("39 is CRITICAL (below criticalLow)", () => {
    const r = evaluateStatus({ ...baseline, humidity: 39 }, thresholds);
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("HUMIDITY_CRITICAL_LOW");
  });
  it("40 (== criticalLow) is WARNING", () => {
    const r = evaluateStatus({ ...baseline, humidity: 40 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("HUMIDITY_WARNING_LOW");
  });
  it("50 (== warningLow) is NORMAL", () => {
    const r = evaluateStatus({ ...baseline, humidity: 50 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
  it("71 (== warningHigh) is NORMAL", () => {
    const r = evaluateStatus({ ...baseline, humidity: 71 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
  it("80 (== criticalHigh) is still WARNING", () => {
    const r = evaluateStatus({ ...baseline, humidity: 80 }, thresholds);
    expect(r.status).toBe("WARNING");
    expect(r.reasons).toContain("HUMIDITY_WARNING_HIGH");
  });
  it("81 is CRITICAL (above criticalHigh)", () => {
    const r = evaluateStatus({ ...baseline, humidity: 81 }, thresholds);
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("HUMIDITY_CRITICAL_HIGH");
  });
});

describe("evaluateStatus — water level boundaries (15/30)", () => {
  it("14 is WATER_LOW", () => {
    const r = evaluateStatus({ ...baseline, waterLevel: 14 }, thresholds);
    expect(r.status).toBe("WATER_LOW");
    expect(r.reasons).toContain("WATER_LOW");
  });
  it("15 (== criticalLow) is NORMAL, not WATER_LOW", () => {
    const r = evaluateStatus({ ...baseline, waterLevel: 15 }, thresholds);
    expect(r.status).toBe("NORMAL");
    expect(r.reasons).not.toContain("WATER_LOW");
  });
  it("30 (== warningLow, UI marker only) does not affect status engine", () => {
    const r = evaluateStatus({ ...baseline, waterLevel: 30 }, thresholds);
    expect(r.status).toBe("NORMAL");
  });
});

describe("evaluateStatus — priority ordering CRITICAL > WATER_LOW > WARNING", () => {
  it("WATER_LOW is still included as a reason when overall status is CRITICAL", () => {
    const r = evaluateStatus(
      { soilMoisture: 10, temperature: 25, humidity: 60, waterLevel: 10 },
      thresholds,
    );
    expect(r.status).toBe("CRITICAL");
    expect(r.reasons).toContain("SOIL_CRITICAL_DRY");
    expect(r.reasons).toContain("WATER_LOW");
  });
  it("WATER_LOW outranks a mere WARNING", () => {
    const r = evaluateStatus(
      { soilMoisture: 35, temperature: 25, humidity: 60, waterLevel: 10 },
      thresholds,
    );
    expect(r.status).toBe("WATER_LOW");
  });
});

describe("evaluateStatus — sensor failure (null)", () => {
  it("a null soil reading is reported as SENSOR_ERROR and never downgraded to NORMAL", () => {
    const r = evaluateStatus({ ...baseline, soilMoisture: null }, thresholds);
    expect(r.reasons).toContain("SENSOR_ERROR");
    expect(r.status).not.toBe("NORMAL");
  });
  it("a null water level is fail-safe treated as WATER_LOW", () => {
    const r = evaluateStatus({ ...baseline, waterLevel: null }, thresholds);
    expect(r.status).toBe("WATER_LOW");
    expect(r.reasons).toContain("WATER_LOW");
    expect(r.reasons).toContain("SENSOR_ERROR");
  });
  it("a null temperature and humidity together still report SENSOR_ERROR once each sensor is checked", () => {
    const r = evaluateStatus({ ...baseline, temperature: null, humidity: null }, thresholds);
    expect(r.reasons).toContain("SENSOR_ERROR");
    expect(r.status).toBe("WARNING");
  });
});
