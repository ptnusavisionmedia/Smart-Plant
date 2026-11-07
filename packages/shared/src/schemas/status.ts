import { z } from "zod";

/** Priority order (highest first): CRITICAL > WATER_LOW > WARNING > NORMAL. */
export const StatusSchema = z.enum(["NORMAL", "WARNING", "CRITICAL", "WATER_LOW"]);
export type Status = z.infer<typeof StatusSchema>;

export const StatusReasonSchema = z.enum([
  "SOIL_CRITICAL_DRY",
  "SOIL_CRITICAL_WET",
  "SOIL_WARNING_DRY",
  "SOIL_WARNING_WET",
  "TEMP_CRITICAL_LOW",
  "TEMP_CRITICAL_HIGH",
  "TEMP_WARNING_LOW",
  "TEMP_WARNING_HIGH",
  "HUMIDITY_CRITICAL_LOW",
  "HUMIDITY_CRITICAL_HIGH",
  "HUMIDITY_WARNING_LOW",
  "HUMIDITY_WARNING_HIGH",
  "WATER_LOW",
  "SENSOR_ERROR",
]);
export type StatusReason = z.infer<typeof StatusReasonSchema>;
