import type { Thresholds } from "./schemas/config.js";

/** Default device_configs values for a newly claimed device (Tech Spec §5 "Konfigurasi default"). */
export const DEFAULT_DEVICE_CONFIG = {
  targetMoisture: 55,
  maxPumpSeconds: 60,
  cooldownSeconds: 30 * 60,
  telemetryIntervalSeconds: 30,
  waterLevelSource: "ultrasonic" as const,
  tankHeightCm: 30,
  tankMaxLevelCm: 25,
  configVersion: 1,
};

/** Auto mode starts OFF until the device has acknowledged a valid config (§4.4 step 8). */
export const DEFAULT_AUTO_MODE = false;

/** Consecutive samples required before acting on a status/watering boundary crossing (§4.3/§4.4). */
export const DEBOUNCE_SAMPLE_COUNT = 3;

/** A device is considered offline once last_seen_at is older than this multiple of its telemetry interval. */
export const OFFLINE_MULTIPLIER = 3;

/** Manual watering command ack timeout before the API reports 504 DEVICE_TIMEOUT (§4.5). */
export const WATERING_ACK_TIMEOUT_MS = 5_000;

/** Default manual watering duration when the client does not specify one. */
export const DEFAULT_MANUAL_WATERING_SECONDS = 10;

/** Notification cooldown per device/type; CRITICAL and WATER_LOW bypass this on transition (§4.7). */
export const NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000;

export const NOTIFICATION_RETRY_MAX_ATTEMPTS = 3;

/** Retention windows (§2 "Agregasi & Retensi"). */
export const RAW_READINGS_RETENTION_DAYS = 90;
export const ROLLUP_RETENTION_DAYS = 2 * 365;

/** History query ceilings per `interval` (§3 "Contoh Kontrak Penting"). */
export const HISTORY_MAX_RANGE_DAYS = {
  raw: 1,
  hour: 90,
  day: 2 * 365,
} as const;

export const HISTORY_MAX_POINTS = 120;

/** Telegram deep-link code validity window (§5 "Keamanan"). */
export const TELEGRAM_LINK_CODE_TTL_MS = 10 * 60 * 1000;

/** Auth token lifetimes (§5 "Keamanan"). */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const EMAIL_VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
export const LOGIN_LOCKOUT_MAX_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export const ARGON2ID_OPTIONS = {
  memoryCost: 64 * 1024, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

/** Seed system plant profiles (§5 "Konfigurasi default yang di-seed"). */
export const SYSTEM_PLANT_PROFILES: Array<{ name: string; thresholds: Thresholds }> = [
  {
    name: "Tanaman Hias Tropis",
    thresholds: {
      soil: { criticalLow: 25, warningLow: 40, warningHigh: 71, criticalHigh: 85 },
      temp: { criticalLow: 15, warningLow: 18, warningHigh: 31, criticalHigh: 35 },
      humidity: { criticalLow: 40, warningLow: 50, warningHigh: 71, criticalHigh: 80 },
      water: { warningLow: 30, criticalLow: 15 },
    },
  },
  {
    name: "Sukulen",
    thresholds: {
      soil: { criticalLow: 10, warningLow: 20, warningHigh: 50, criticalHigh: 70 },
      temp: { criticalLow: 10, warningLow: 15, warningHigh: 35, criticalHigh: 40 },
      humidity: { criticalLow: 20, warningLow: 30, warningHigh: 60, criticalHigh: 75 },
      water: { warningLow: 30, criticalLow: 15 },
    },
  },
  {
    name: "Sayuran Daun",
    thresholds: {
      soil: { criticalLow: 35, warningLow: 45, warningHigh: 75, criticalHigh: 90 },
      temp: { criticalLow: 18, warningLow: 20, warningHigh: 30, criticalHigh: 34 },
      humidity: { criticalLow: 50, warningLow: 55, warningHigh: 80, criticalHigh: 90 },
      water: { warningLow: 30, criticalLow: 15 },
    },
  },
];

export const MQTT_TOPIC = {
  telemetry: (deviceId: string) => `sp/${deviceId}/telemetry`,
  presence: (deviceId: string) => `sp/${deviceId}/presence`,
  command: (deviceId: string) => `sp/${deviceId}/command`,
  ack: (deviceId: string) => `sp/${deviceId}/ack`,
  state: (deviceId: string) => `sp/${deviceId}/state`,
  /** Subscription wildcard used by the API bridge. */
  allForDevice: (deviceId: string) => `sp/${deviceId}/#`,
} as const;
