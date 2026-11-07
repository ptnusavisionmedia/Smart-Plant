import type { FastifyInstance } from "fastify";

const RAW_RETENTION_DAYS = 90;
const ROLLUP_RETENTION_DAYS = 2 * 365;

/** Deletes raw readings older than 90 days and rollup rows older than 2 years (Tech Spec §2 retention policy). */
export function runRetention(app: FastifyInstance) {
  const rawCutoffMs = Date.now() - RAW_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  app.repos.readings.deleteRawOlderThan(rawCutoffMs);

  const rollupCutoffDay = new Date(Date.now() - ROLLUP_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  app.repos.readings.deleteRollupOlderThan(rollupCutoffDay);
}
