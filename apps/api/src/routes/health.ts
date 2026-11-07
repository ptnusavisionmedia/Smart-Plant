import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getMetricsSnapshot } from "../metrics.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/metrics", async () => getMetricsSnapshot(app));

  app.get("/health", async () => {
    return { status: "ok", uptimeSeconds: Math.round(process.uptime()) };
  });

  app.get("/ready", async (_req, reply) => {
    try {
      app.db.run(sql`select 1`);
    } catch {
      reply.code(503);
      return { status: "not_ready", reason: "database_unavailable" };
    }

    if (!app.mqttMetrics.connected) {
      reply.code(503);
      return { status: "not_ready", reason: "mqtt_unavailable" };
    }

    return { status: "ready" };
  });
}
