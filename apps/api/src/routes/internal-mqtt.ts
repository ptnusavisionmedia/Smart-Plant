import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { loadConfig } from "../config.js";
import { timingSafeStringEqual } from "../crypto-utils.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Backs mosquitto-go-auth's HTTP backend (T-18). The broker calls these for
 * every CONNECT (getuser) and every PUBLISH/SUBSCRIBE (aclcheck); both must
 * respond fast and only ever say yes for a device's own `sp/{deviceUid}/#`
 * topics. The API bridge's own bridge user is allowlisted separately below.
 */
export default async function internalMqttRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireInternalSecret);

  app.post("/internal/mqtt/auth", async (req, reply) => {
    const body = req.body as { username?: string; password?: string };
    const config = loadConfig();

    if (body.username === config.MQTT_BRIDGE_USERNAME) {
      if (body.password && timingSafeStringEqual(body.password, config.MQTT_BRIDGE_PASSWORD)) {
        reply.code(200);
        return { ok: true };
      }
      reply.code(403);
      return { ok: false };
    }

    const device = body.username ? app.repos.devices.findByDeviceUid(body.username) : undefined;
    if (!device || !body.password || !timingSafeStringEqual(sha256(body.password), device.mqttSecretHash)) {
      reply.code(403);
      return { ok: false };
    }

    reply.code(200);
    return { ok: true };
  });

  app.post("/internal/mqtt/acl", async (req, reply) => {
    const body = req.body as { username?: string; topic?: string; acc?: number };
    const config = loadConfig();

    if (body.username === config.MQTT_BRIDGE_USERNAME) {
      reply.code(200);
      return { ok: true };
    }

    const allowedPrefix = `sp/${body.username}/`;
    if (body.username && body.topic?.startsWith(allowedPrefix)) {
      reply.code(200);
      return { ok: true };
    }

    reply.code(403);
    return { ok: false };
  });
}
