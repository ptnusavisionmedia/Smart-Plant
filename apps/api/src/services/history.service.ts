import type { Repositories } from "@smart-plant/db";
import { HISTORY_MAX_RANGE_DAYS, HISTORY_MAX_POINTS, type ReadingsQuery, type ReadingsResponse } from "@smart-plant/shared";
import { Errors } from "../errors.js";

function downsample<T>(rows: T[], maxPoints: number): T[] {
  if (rows.length <= maxPoints) return rows;
  const stride = rows.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(rows[Math.floor(i * stride)]!);
  }
  return result;
}

export function createHistoryService(repos: Repositories) {
  return {
    query(deviceId: string, query: ReadingsQuery): ReadingsResponse {
      const now = Date.now();
      const toMs = query.to ? Date.parse(query.to) : now;
      const defaultFromMs = toMs - HISTORY_MAX_RANGE_DAYS[query.interval] * 24 * 60 * 60 * 1000;
      const fromMs = query.from ? Date.parse(query.from) : defaultFromMs;

      const maxRangeMs = HISTORY_MAX_RANGE_DAYS[query.interval] * 24 * 60 * 60 * 1000;
      if (toMs - fromMs > maxRangeMs) {
        throw Errors.badRequest(
          `Rentang untuk interval "${query.interval}" maksimal ${HISTORY_MAX_RANGE_DAYS[query.interval]} hari`,
        );
      }

      if (query.interval === "raw") {
        const rows = downsample(repos.readings.queryRaw(deviceId, fromMs, toMs), HISTORY_MAX_POINTS);
        return {
          interval: "raw",
          points: rows.map((r) => ({
            bucket: new Date(r.time).toISOString(),
            soilMoisture: r.soilMoisture,
            temperature: r.temperature,
            humidity: r.humidity,
            waterLevel: r.waterLevel,
          })),
        };
      }

      if (query.interval === "hour") {
        const rows = downsample(repos.readings.queryHourly(deviceId, fromMs, toMs), HISTORY_MAX_POINTS);
        return {
          interval: "hour",
          points: rows.map((r) => ({
            bucket: new Date(r.bucket).toISOString(),
            soilMoisture: r.soilMoisture,
            temperature: r.temperature,
            humidity: r.humidity,
            waterLevel: r.waterLevel,
          })),
        };
      }

      const fromDay = new Date(fromMs).toISOString().slice(0, 10);
      const toDay = new Date(toMs).toISOString().slice(0, 10);
      const rows = downsample(repos.readings.queryDaily(deviceId, fromDay, toDay), HISTORY_MAX_POINTS);
      return {
        interval: "day",
        points: rows.map((r) => ({
          bucket: new Date(`${r.day}T00:00:00.000Z`).toISOString(),
          soilMoisture: r.soilAvg,
          temperature: r.tempAvg,
          humidity: r.humidityAvg,
          waterLevel: r.waterAvg,
        })),
      };
    },
  };
}

export type HistoryService = ReturnType<typeof createHistoryService>;
