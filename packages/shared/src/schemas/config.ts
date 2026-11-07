import { z } from "zod";

const RangeThresholdSchema = z
  .object({
    criticalLow: z.number().min(-50).max(150),
    warningLow: z.number().min(-50).max(150),
    warningHigh: z.number().min(-50).max(150),
    criticalHigh: z.number().min(-50).max(150),
  })
  .strict()
  .refine((t) => t.criticalLow < t.warningLow, {
    message: "criticalLow harus lebih rendah dari warningLow",
    path: ["criticalLow"],
  })
  .refine((t) => t.warningLow < t.warningHigh, {
    message: "warningLow harus lebih rendah dari warningHigh",
    path: ["warningLow"],
  })
  .refine((t) => t.warningHigh < t.criticalHigh, {
    message: "warningHigh harus lebih rendah dari criticalHigh",
    path: ["warningHigh"],
  });
export type RangeThreshold = z.infer<typeof RangeThresholdSchema>;

const WaterThresholdSchema = z
  .object({
    warningLow: z.number().min(0).max(100),
    criticalLow: z.number().min(0).max(100),
  })
  .strict()
  .refine((t) => t.criticalLow < t.warningLow, {
    message: "criticalLow (WATER_LOW) harus lebih rendah dari warningLow",
    path: ["criticalLow"],
  });
export type WaterThreshold = z.infer<typeof WaterThresholdSchema>;

export const ThresholdsSchema = z
  .object({
    soil: RangeThresholdSchema,
    temp: RangeThresholdSchema,
    humidity: RangeThresholdSchema,
    water: WaterThresholdSchema,
  })
  .strict();
export type Thresholds = z.infer<typeof ThresholdsSchema>;

export const WaterLevelSourceSchema = z.enum(["ultrasonic", "float_switch"]);
export type WaterLevelSource = z.infer<typeof WaterLevelSourceSchema>;

export const DeviceConfigSchema = z
  .object({
    deviceId: z.string(),
    thresholds: ThresholdsSchema,
    targetMoisture: z.number().min(0).max(100),
    maxPumpSeconds: z.number().int().min(1).max(60),
    cooldownSeconds: z.number().int().min(0).max(24 * 60 * 60),
    telemetryIntervalSeconds: z.number().int().min(5).max(3600),
    waterLevelSource: WaterLevelSourceSchema,
    tankHeightCm: z.number().min(1).max(1000),
    tankMaxLevelCm: z.number().min(1).max(1000),
    configVersion: z.number().int().min(1),
  })
  .strict()
  .refine((c) => c.targetMoisture > c.thresholds.soil.warningLow, {
    message: "targetMoisture harus di atas thresholds.soil.warningLow",
    path: ["targetMoisture"],
  });
export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;

export const UpdateDeviceConfigRequestSchema = z
  .object({
    thresholds: ThresholdsSchema.partial().optional(),
    targetMoisture: z.number().min(0).max(100).optional(),
    maxPumpSeconds: z.number().int().min(1).max(60).optional(),
    cooldownSeconds: z.number().int().min(0).max(24 * 60 * 60).optional(),
    telemetryIntervalSeconds: z.number().int().min(5).max(3600).optional(),
    waterLevelSource: WaterLevelSourceSchema.optional(),
    tankHeightCm: z.number().min(1).max(1000).optional(),
    tankMaxLevelCm: z.number().min(1).max(1000).optional(),
  })
  .strict();
export type UpdateDeviceConfigRequest = z.infer<typeof UpdateDeviceConfigRequestSchema>;
