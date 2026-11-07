import type { Status, StatusReason } from "@smart-plant/shared";

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "tidak pernah";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.round((now - then) / 1000));

  if (diffSeconds < 5) return "baru saja";
  if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} hari lalu`;
  return formatDateTime(iso);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium" });
}

export function formatNumber(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export const STATUS_LABEL: Record<Status, string> = {
  NORMAL: "Normal",
  WARNING: "Waspada",
  CRITICAL: "Kritis",
  WATER_LOW: "Air rendah",
};

export const STATUS_REASON_LABEL: Record<StatusReason, string> = {
  SOIL_CRITICAL_DRY: "Tanah sangat kering (kritis)",
  SOIL_CRITICAL_WET: "Tanah sangat basah (kritis)",
  SOIL_WARNING_DRY: "Tanah mulai kering",
  SOIL_WARNING_WET: "Tanah terlalu basah",
  TEMP_CRITICAL_LOW: "Suhu sangat rendah (kritis)",
  TEMP_CRITICAL_HIGH: "Suhu sangat tinggi (kritis)",
  TEMP_WARNING_LOW: "Suhu rendah",
  TEMP_WARNING_HIGH: "Suhu tinggi",
  HUMIDITY_CRITICAL_LOW: "Kelembapan udara sangat rendah (kritis)",
  HUMIDITY_CRITICAL_HIGH: "Kelembapan udara sangat tinggi (kritis)",
  HUMIDITY_WARNING_LOW: "Kelembapan udara rendah",
  HUMIDITY_WARNING_HIGH: "Kelembapan udara tinggi",
  WATER_LOW: "Tangki air rendah",
  SENSOR_ERROR: "Sensor bermasalah",
};

export const WATERING_STATE_LABEL: Record<string, string> = {
  pending: "Menunggu",
  running: "Sedang menyiram",
  completed: "Selesai",
  stopped: "Dihentikan",
  rejected: "Ditolak",
  timeout: "Waktu habis",
};

export const API_ERROR_MESSAGE: Record<string, string> = {
  WATER_LOW: "Tangki air rendah, penyiraman diblokir. Isi ulang tangki terlebih dahulu.",
  EMERGENCY_STOP: "Perangkat dalam mode emergency stop. Reset emergency sebelum menyiram.",
  DEVICE_OFFLINE: "Perangkat sedang offline, perintah tidak dapat dikirim.",
  RATE_LIMITED: "Terlalu banyak permintaan. Coba lagi sebentar.",
  DEVICE_TIMEOUT: "Perangkat tidak merespons dalam 5 detik.",
  EMAIL_TAKEN: "Email sudah terdaftar.",
  UNAUTHORIZED: "Sesi Anda berakhir. Silakan masuk kembali.",
  NETWORK_ERROR: "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
};

export function describeApiError(code: string, fallback: string): string {
  return API_ERROR_MESSAGE[code] ?? fallback;
}

/**
 * DESIGN.md "Live and stale indicator": data counts as "Live" only if the
 * last reading is within 2x the telemetry interval.
 */
export function isWithinLiveWindow(
  tsIso: string | null,
  telemetryIntervalSeconds: number,
  multiplier = 2,
): boolean {
  if (!tsIso) return false;
  const ageSeconds = (Date.now() - new Date(tsIso).getTime()) / 1000;
  return ageSeconds <= telemetryIntervalSeconds * multiplier;
}
