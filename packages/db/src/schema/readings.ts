import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";
import { devices } from "./devices.js";

// Tech Spec §2 specifies `WITHOUT ROWID` for these two tables as a storage
// optimization. drizzle-kit's SQLite dialect has no builder for that clause,
// so we use an ordinary composite primary key instead — correct at pilot
// scale (<=100 devices), just without that extra optimization.

export const sensorReadings = sqliteTable(
  "sensor_readings",
  {
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    time: integer("time").notNull(),
    soilMoisture: real("soil_moisture"),
    temperature: real("temperature"),
    humidity: real("humidity"),
    waterLevel: real("water_level"),
    waterLevelCm: real("water_level_cm"),
    waterLevelSource: text("water_level_source", { enum: ["ultrasonic", "float_switch"] })
      .notNull()
      .default("ultrasonic"),
    pumpOn: integer("pump_on", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull(),
    /** JSON-encoded raw payload, kept for debugging/replay. */
    raw: text("raw"),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.time] }),
    index("idx_readings_time").on(table.time),
  ],
);

export const statusEvents = sqliteTable(
  "status_events",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    /** JSON-encoded string[] of StatusReason. */
    reasons: text("reasons").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_status_events_device_created").on(table.deviceId, table.createdAt)],
);

export const wateringEvents = sqliteTable(
  "watering_events",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    trigger: text("trigger", { enum: ["auto", "manual", "emergency"] }).notNull(),
    commandId: text("command_id"),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
    durationSeconds: integer("duration_seconds"),
    status: text("status", {
      enum: ["running", "completed", "stopped", "rejected", "timeout"],
    }).notNull(),
  },
  (table) => [index("idx_watering_events_device_started").on(table.deviceId, table.startedAt)],
);

export const readingsDaily = sqliteTable(
  "readings_daily",
  {
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD, UTC. */
    day: text("day").notNull(),
    soilAvg: real("soil_avg"),
    soilMin: real("soil_min"),
    soilMax: real("soil_max"),
    tempAvg: real("temp_avg"),
    humidityAvg: real("humidity_avg"),
    waterAvg: real("water_avg"),
  },
  (table) => [primaryKey({ columns: [table.deviceId, table.day] })],
);
