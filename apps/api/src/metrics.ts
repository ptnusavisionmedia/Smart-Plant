import { statSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import { resolveDatabaseFile } from "@smart-plant/db";

export interface AckLatencyTracker {
  record(ms: number): void;
  averageMs(): number;
}

export function createAckLatencyTracker(maxSamples = 100): AckLatencyTracker {
  const samples: number[] = [];
  return {
    record(ms: number) {
      samples.push(ms);
      if (samples.length > maxSamples) samples.shift();
    },
    averageMs() {
      if (samples.length === 0) return 0;
      return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    },
  };
}

export const ackLatencyTracker = createAckLatencyTracker();

export function getMetricsSnapshot(app: FastifyInstance) {
  let dbSizeBytes = 0;
  try {
    dbSizeBytes = statSync(resolveDatabaseFile()).size;
  } catch {
    dbSizeBytes = 0;
  }

  return {
    mqtt: {
      connected: app.mqttMetrics.connected,
      messagesIn: app.mqttMetrics.messagesIn,
      validationFailed: app.mqttMetrics.validationFailed,
      statusTransitions: app.mqttMetrics.statusTransitions,
    },
    watering: {
      averageAckLatencyMs: ackLatencyTracker.averageMs(),
    },
    database: {
      sizeBytes: dbSizeBytes,
    },
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: process.memoryUsage().rss,
    },
  };
}
