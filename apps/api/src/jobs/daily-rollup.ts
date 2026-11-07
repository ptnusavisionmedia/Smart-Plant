import type { FastifyInstance } from "fastify";

/** Computes yesterday's (UTC) readings_daily rollup for every device — runs once at 00:10 UTC. */
export function runDailyRollup(app: FastifyInstance) {
  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const day = yesterday.toISOString().slice(0, 10);
  const dayStartMs = yesterday.getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000 - 1;

  const devices = app.repos.devices.listAllClaimed();
  for (const device of devices) {
    app.repos.readings.rollupDay(device.id, day, dayStartMs, dayEndMs);
  }
}
