import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Errors } from "../errors.js";

interface Bucket {
  count: number;
  windowStartedAt: number;
}

/** Simple in-memory fixed-window rate limiter (single-instance V1, Tech Spec §5). */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function check(key: string) {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStartedAt >= windowMs) {
      buckets.set(key, { count: 1, windowStartedAt: now });
      return;
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      throw Errors.tooManyRequests();
    }
  };
}

declare module "fastify" {
  interface FastifyInstance {
    rateLimiters: {
      auth: ReturnType<typeof createRateLimiter>;
      watering: ReturnType<typeof createRateLimiter>;
      command: ReturnType<typeof createRateLimiter>;
      claim: ReturnType<typeof createRateLimiter>;
    };
  }
}

export default fp(
  async function rateLimitPlugin(app: FastifyInstance) {
    app.decorate("rateLimiters", {
      auth: createRateLimiter(5, 60_000), // 5/minute/IP
      watering: createRateLimiter(10, 60_000), // 10/minute/user
      command: createRateLimiter(20, 60_000), // 20/minute/device
      claim: createRateLimiter(5, 60 * 60_000), // 5/hour/user
    });
  },
  { name: "rateLimitPlugin" },
);

export function clientIp(req: FastifyRequest): string {
  return req.ip;
}
