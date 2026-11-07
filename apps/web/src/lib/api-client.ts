/**
 * Typed fetch wrapper around the Smart Plant API (`apps/api`).
 *
 * Auth model (per the API's `apps/api/src/routes/auth.ts`):
 * - Access token: short-lived (15 min) JWT, kept in memory only (never
 *   localStorage). Sent as `Authorization: Bearer <token>`.
 * - Refresh token: httpOnly cookie `refresh_token` scoped to `/api/v1/auth`,
 *   managed entirely by the browser cookie jar. We never read or store it
 *   ourselves; every request uses `credentials: "include"` so the cookie
 *   rides along automatically on refresh/logout calls.
 *
 * On a 401 response (other than from the refresh call itself) we attempt one
 * silent refresh and retry the original request once before giving up.
 */
import type {
  AuthTokens,
  ClaimDeviceRequest,
  CreatePlantProfileRequest,
  DeviceConfig,
  DeviceSummary,
  ManualWateringResponse,
  Notification,
  NotificationListResponse,
  NotificationPreferences,
  PlantProfile,
  ReadingsResponse,
  RegisterRequest,
  UpdateDeviceConfigRequest,
  UpdateDeviceRequest,
  UpdateNotificationPreferencesRequest,
  UpdatePlantProfileRequest,
  UserProfile,
} from "@smart-plant/shared";
import type {
  AuthLoginResult,
  DeviceDetail,
  ListResponse,
  StatusEventItem,
  WateringEventItem,
} from "./types";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Thrown when the client has no network/API reachable at all. */
export class NetworkError extends Error {
  constructor(message = "Tidak dapat terhubung ke server. Periksa koneksi Anda.") {
    super(message);
    this.name = "NetworkError";
  }
}

// --- In-memory access token + change notification -------------------------

let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  for (const listener of listeners) listener(token);
}

export function onAccessTokenChange(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- Core request helper ----------------------------------------------------

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Skip the Authorization header (used for login/register/refresh). */
  skipAuth?: boolean;
  /** Skip the 401-triggers-refresh-then-retry-once behaviour. */
  skipRefreshRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (!options.skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: "include",
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    if (
      response.status === 401 &&
      !options.skipAuth &&
      !options.skipRefreshRetry
    ) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawRequest<T>(path, { ...options, skipRefreshRetry: true });
      }
    }

    const code = (data?.code as string | undefined) ?? "UNKNOWN_ERROR";
    const message = (data?.message as string | undefined) ?? "Terjadi kesalahan tak terduga.";
    throw new ApiError(response.status, code, message, data?.details);
  }

  return data as T;
}

let refreshPromise: Promise<boolean> | null = null;

/** Silent refresh using the httpOnly cookie. Deduplicates concurrent callers. */
async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const result = await rawRequest<AuthLoginResult>("/api/v1/auth/refresh", {
        method: "POST",
        skipAuth: true,
        skipRefreshRetry: true,
      });
      setAccessToken(result.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    }
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function refreshSession(): Promise<boolean> {
  return tryRefresh();
}

// --- Auth --------------------------------------------------------------

export async function registerAccount(body: RegisterRequest): Promise<UserProfile> {
  return rawRequest<UserProfile>("/api/v1/auth/register", { method: "POST", body, skipAuth: true });
}

export async function login(body: { email: string; password: string }): Promise<AuthLoginResult> {
  const result = await rawRequest<AuthLoginResult>("/api/v1/auth/login", {
    method: "POST",
    body,
    skipAuth: true,
  });
  setAccessToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await rawRequest<void>("/api/v1/auth/logout", { method: "POST", skipRefreshRetry: true });
  } finally {
    setAccessToken(null);
  }
}

export async function forgotPassword(email: string): Promise<{ ok: boolean }> {
  return rawRequest("/api/v1/auth/forgot-password", { method: "POST", body: { email }, skipAuth: true });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
  return rawRequest("/api/v1/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
    skipAuth: true,
  });
}

export async function fetchMe(): Promise<UserProfile> {
  return rawRequest<UserProfile>("/api/v1/auth/me");
}

export type { AuthTokens };

// --- Devices -------------------------------------------------------------

export async function listDevices(): Promise<ListResponse<DeviceSummary>> {
  return rawRequest("/api/v1/devices");
}

export async function claimDevice(body: ClaimDeviceRequest): Promise<DeviceSummary> {
  return rawRequest("/api/v1/devices/claim", { method: "POST", body });
}

export async function getDevice(id: string): Promise<DeviceDetail> {
  return rawRequest(`/api/v1/devices/${id}`);
}

export async function updateDevice(id: string, body: UpdateDeviceRequest): Promise<DeviceSummary> {
  return rawRequest(`/api/v1/devices/${id}`, { method: "PATCH", body });
}

export async function deleteDevice(id: string): Promise<void> {
  return rawRequest(`/api/v1/devices/${id}`, { method: "DELETE" });
}

export async function updateDeviceConfig(
  id: string,
  body: UpdateDeviceConfigRequest,
): Promise<DeviceConfig> {
  return rawRequest(`/api/v1/devices/${id}/config`, { method: "PATCH", body });
}

export async function startWatering(
  id: string,
  durationSeconds: number,
): Promise<ManualWateringResponse> {
  return rawRequest(`/api/v1/devices/${id}/watering`, {
    method: "POST",
    body: { durationSeconds },
  });
}

export async function emergencyStop(id: string): Promise<{ ok: boolean }> {
  return rawRequest(`/api/v1/devices/${id}/emergency-stop`, { method: "POST" });
}

export async function emergencyReset(id: string, resumeAutoMode = false): Promise<{ ok: boolean }> {
  return rawRequest(`/api/v1/devices/${id}/emergency-reset`, {
    method: "POST",
    body: { resumeAutoMode },
  });
}

export async function getReadings(
  id: string,
  query: { from?: string; to?: string; interval?: "raw" | "hour" | "day" },
): Promise<ReadingsResponse> {
  return rawRequest(`/api/v1/devices/${id}/readings`, { query });
}

export async function getStatusEvents(id: string): Promise<ListResponse<StatusEventItem>> {
  return rawRequest(`/api/v1/devices/${id}/status-events`);
}

export async function getWateringEvents(id: string): Promise<ListResponse<WateringEventItem>> {
  return rawRequest(`/api/v1/devices/${id}/watering-events`);
}

// --- Plant profiles --------------------------------------------------------

export async function listPlantProfiles(): Promise<ListResponse<PlantProfile>> {
  return rawRequest("/api/v1/plant-profiles");
}

export async function createPlantProfile(body: CreatePlantProfileRequest): Promise<PlantProfile> {
  return rawRequest("/api/v1/plant-profiles", { method: "POST", body });
}

export async function updatePlantProfile(
  id: string,
  body: UpdatePlantProfileRequest,
): Promise<PlantProfile> {
  return rawRequest(`/api/v1/plant-profiles/${id}`, { method: "PATCH", body });
}

export async function deletePlantProfile(id: string): Promise<void> {
  return rawRequest(`/api/v1/plant-profiles/${id}`, { method: "DELETE" });
}

// --- Notifications -----------------------------------------------------

export async function listNotifications(
  cursor?: string | null,
  limit = 20,
): Promise<NotificationListResponse> {
  return rawRequest("/api/v1/notifications", { query: { cursor: cursor ?? undefined, limit } });
}

export async function markNotificationRead(id: string): Promise<void> {
  return rawRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  return rawRequest("/api/v1/notifications/read-all", { method: "PATCH" });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return rawRequest("/api/v1/notification-preferences");
}

export async function updateNotificationPreferences(
  body: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferences> {
  return rawRequest("/api/v1/notification-preferences", { method: "PATCH", body });
}

// --- Telegram integration --------------------------------------------------

export async function linkTelegram(): Promise<{ code: string; expiresInSeconds: number }> {
  return rawRequest("/api/v1/integrations/telegram/link", { method: "POST" });
}

export async function unlinkTelegram(): Promise<void> {
  return rawRequest("/api/v1/integrations/telegram/link", { method: "DELETE" });
}

export type { Notification };
