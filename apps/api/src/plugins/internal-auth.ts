import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { loadConfig } from "../config.js";
import { Errors } from "../errors.js";
import { timingSafeStringEqual } from "../crypto-utils.js";

declare module "fastify" {
  interface FastifyInstance {
    requireInternalSecret: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Guards /internal/* routes (T-18): only Mosquitto's auth/ACL HTTP backend
 * should reach these, carried over the Docker-internal network in production.
 * The shared secret is accepted via query string (?secret=) — how
 * mosquitto-go-auth is configured to call these URIs — or an explicit header
 * for direct testing/tools.
 */
export default fp(
  async function internalAuthPlugin(app: FastifyInstance) {
    const config = loadConfig();

    app.decorate("requireInternalSecret", async (req: FastifyRequest, _reply: FastifyReply) => {
      const query = req.query as Record<string, unknown>;
      const headerSecret = req.headers["x-internal-secret"];
      const provided = (query.secret as string | undefined) ?? (Array.isArray(headerSecret) ? headerSecret[0] : headerSecret);

      if (!provided || !timingSafeStringEqual(provided, config.INTERNAL_MQTT_SHARED_SECRET)) {
        throw Errors.unauthorized("Internal shared secret tidak valid");
      }
    });
  },
  { name: "internalAuthPlugin" },
);
