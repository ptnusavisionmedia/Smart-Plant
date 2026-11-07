import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { loadConfig } from "../config.js";
import { Errors } from "../errors.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export default fp(
  async function authPlugin(app: FastifyInstance) {
    const config = loadConfig();

    await app.register(jwt, {
      secret: config.JWT_ACCESS_SECRET,
    });

    app.decorate("authenticate", async (req: FastifyRequest, _reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        throw Errors.unauthorized("Token akses tidak valid atau kedaluwarsa");
      }
    });
  },
  { name: "authPlugin" },
);

export function userIdFromRequest(req: FastifyRequest): string {
  return req.user.sub;
}
