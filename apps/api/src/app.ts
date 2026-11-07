import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { loadConfig } from "./config.js";
import { buildLoggerOptions } from "./plugins/logger.js";
import dbPlugin from "./plugins/db.js";
import authPlugin from "./plugins/auth.js";
import internalAuthPlugin from "./plugins/internal-auth.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import servicesPlugin from "./plugins/services.js";
import websocketPlugin from "./plugins/websocket.js";
import mqttPlugin from "./plugins/mqtt.js";
import schedulerPlugin from "./jobs/scheduler.js";
import { latestState } from "./realtime/latest-state.js";
import { wsHub } from "./realtime/ws-hub.js";

import authRoutes from "./routes/auth.js";
import deviceRoutes from "./routes/devices.js";
import plantProfileRoutes from "./routes/plant-profiles.js";
import notificationRoutes from "./routes/notifications.js";
import integrationRoutes from "./routes/integrations.js";
import internalMqttRoutes from "./routes/internal-mqtt.js";
import healthRoutes from "./routes/health.js";

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();

  const app = Fastify({
    logger: buildLoggerOptions(),
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: config.NODE_ENV === "production" });
  await app.register(cors, { origin: config.corsAllowedOrigins, credentials: true });
  await app.register(cookie);

  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(internalAuthPlugin);
  await app.register(rateLimitPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(servicesPlugin);
  await app.register(websocketPlugin);
  await app.register(mqttPlugin);
  await app.register(schedulerPlugin);

  // Unversioned infra endpoints (load balancer / container health probes).
  await app.register(healthRoutes);

  await app.register(
    async (versioned) => {
      await versioned.register(authRoutes);
      await versioned.register(deviceRoutes);
      await versioned.register(plantProfileRoutes);
      await versioned.register(notificationRoutes);
      await versioned.register(integrationRoutes);
      await versioned.register(internalMqttRoutes);
      await versioned.register(healthRoutes);
    },
    { prefix: "/api/v1" },
  );

  latestState.hydrate(app.repos, app.repos.devices.listAllClaimed().map((d) => d.id));

  app.addHook("onClose", (_instance, done) => {
    wsHub.close();
    done();
  });

  return app;
}
