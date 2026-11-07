import type { FastifyInstance } from "fastify";
import {
  ClaimDeviceRequestSchema,
  UpdateDeviceRequestSchema,
  UpdateDeviceConfigRequestSchema,
  ManualWateringRequestSchema,
  ReadingsQuerySchema,
  IdParamSchema,
} from "@smart-plant/shared";
import { userIdFromRequest } from "../plugins/auth.js";
import { clientIp } from "../plugins/rate-limit.js";

export default async function deviceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/devices", async (req) => {
    const userId = userIdFromRequest(req);
    return { items: app.services.device.listForUser(userId) };
  });

  app.post("/devices/claim", async (req, reply) => {
    const userId = userIdFromRequest(req);
    app.rateLimiters.claim(userId);
    const body = ClaimDeviceRequestSchema.parse(req.body);
    const device = app.services.device.claim(userId, body);
    reply.code(201);
    return app.services.device.toSummary(device.id);
  });

  app.get("/devices/:id", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.services.device.requireOwned(id, userId);
    const summary = app.services.device.toSummary(id);
    const config = app.repos.configs.getByDeviceId(id);
    return { ...summary, config };
  });

  app.patch("/devices/:id", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    const body = UpdateDeviceRequestSchema.parse(req.body);
    app.services.device.update(id, userId, body);
    return app.services.device.toSummary(id);
  });

  app.delete("/devices/:id", async (req, reply) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.services.device.delete(id, userId);
    reply.code(204);
  });

  app.patch("/devices/:id/config", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.services.device.requireOwned(id, userId);
    const body = UpdateDeviceConfigRequestSchema.parse(req.body);
    return app.services.config.update(id, userId, body);
  });

  app.post("/devices/:id/watering", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.rateLimiters.watering(userId);
    const body = ManualWateringRequestSchema.parse(req.body ?? {});
    return app.services.watering.manualWatering(id, userId, body.durationSeconds);
  });

  app.post("/devices/:id/emergency-stop", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.rateLimiters.command(clientIp(req));
    app.services.watering.emergencyStop(id, userId);
    return { ok: true };
  });

  app.post("/devices/:id/emergency-reset", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.rateLimiters.command(clientIp(req));
    const body = (req.body as { resumeAutoMode?: boolean } | undefined) ?? {};
    app.services.watering.emergencyReset(id, userId, body.resumeAutoMode ?? false);
    return { ok: true };
  });

  app.get("/devices/:id/readings", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.services.device.requireOwned(id, userId);
    const query = ReadingsQuerySchema.parse(req.query);
    return app.services.history.query(id, query);
  });

  app.get("/devices/:id/status-events", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.services.device.requireOwned(id, userId);
    const items = app.repos.events.listStatusEvents(id);
    return {
      items: items.map((e) => ({
        id: e.id,
        status: e.status,
        reasons: JSON.parse(e.reasons),
        createdAt: new Date(e.createdAt).toISOString(),
      })),
    };
  });

  app.get("/devices/:id/watering-events", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.services.device.requireOwned(id, userId);
    const items = app.repos.events.listForDevice(id);
    return {
      items: items.map((e) => ({
        id: e.id,
        trigger: e.trigger,
        status: e.status,
        startedAt: new Date(e.startedAt).toISOString(),
        endedAt: e.endedAt ? new Date(e.endedAt).toISOString() : null,
        durationSeconds: e.durationSeconds,
      })),
    };
  });
}
