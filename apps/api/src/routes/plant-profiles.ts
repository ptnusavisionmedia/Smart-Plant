import type { FastifyInstance } from "fastify";
import { CreatePlantProfileRequestSchema, UpdatePlantProfileRequestSchema, IdParamSchema } from "@smart-plant/shared";
import { Errors } from "../errors.js";
import { userIdFromRequest } from "../plugins/auth.js";

function toPlantProfile(row: { id: string; name: string; isSystem: boolean; ownerUserId: string | null; thresholds: string }) {
  return {
    id: row.id,
    name: row.name,
    isSystem: row.isSystem,
    ownerUserId: row.ownerUserId,
    thresholds: JSON.parse(row.thresholds),
  };
}

export default async function plantProfileRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/plant-profiles", async (req) => {
    const userId = userIdFromRequest(req);
    return { items: app.repos.profiles.listForUser(userId).map(toPlantProfile) };
  });

  app.post("/plant-profiles", async (req, reply) => {
    const userId = userIdFromRequest(req);
    const body = CreatePlantProfileRequestSchema.parse(req.body);
    const row = app.repos.profiles.create({ ownerUserId: userId, name: body.name, thresholds: body.thresholds });
    reply.code(201);
    return toPlantProfile(row);
  });

  app.patch("/plant-profiles/:id", async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    const body = UpdatePlantProfileRequestSchema.parse(req.body);
    try {
      app.repos.profiles.update(id, userId, body);
    } catch {
      throw Errors.forbidden("Profil sistem tidak dapat diubah");
    }
    const row = app.repos.profiles.getById(id);
    if (!row) throw Errors.notFound("Profil tidak ditemukan");
    return toPlantProfile(row);
  });

  app.delete("/plant-profiles/:id", async (req, reply) => {
    const { id } = IdParamSchema.parse(req.params);
    const userId = userIdFromRequest(req);
    app.repos.profiles.delete(id, userId);
    reply.code(204);
  });
}
