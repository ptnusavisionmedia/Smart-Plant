/**
 * Response shapes that the API returns but that `@smart-plant/shared` does not
 * export a dedicated schema for (list envelopes, status/watering event rows).
 * Shaped from `apps/api/src/routes/*.ts` (ground truth) and
 * `packages/db/src/schema/readings.ts`.
 */
import type { DeviceConfig, DeviceSummary, Status, StatusReason } from "@smart-plant/shared";

export interface ListResponse<T> {
  items: T[];
}

export interface DeviceDetail extends DeviceSummary {
  config: DeviceConfig;
}

export interface StatusEventItem {
  id: string;
  status: Status;
  reasons: StatusReason[];
  createdAt: string;
}

export type WateringTrigger = "auto" | "manual" | "emergency";
export type WateringEventStatus = "running" | "completed" | "stopped" | "rejected" | "timeout";

export interface WateringEventItem {
  id: string;
  trigger: WateringTrigger;
  status: WateringEventStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

export interface AuthLoginResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}
