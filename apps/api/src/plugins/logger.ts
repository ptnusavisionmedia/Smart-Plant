import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";

const SENSITIVE_QUERY_KEYS = ["token", "secret"];

/** Strips known-sensitive query params (JWTs on /ws, the internal shared secret) before a URL is logged. */
function sanitizeUrl(url: string): string {
  const [path, query] = url.split("?", 2);
  if (!query) return url;

  const params = new URLSearchParams(query);
  for (const key of SENSITIVE_QUERY_KEYS) {
    if (params.has(key)) params.set(key, "***REDACTED***");
  }
  return `${path}?${params.toString()}`;
}

/** Pino logger options with requestId correlation (T-04). Secrets are never logged. */
export function buildLoggerOptions() {
  const config = loadConfig();
  return {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash", "*.mqttSecretHash"],
    genReqId: (req: { headers: Record<string, unknown> }) =>
      (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
    serializers: {
      req(req: { method: string; url: string; headers: Record<string, unknown>; socket?: { remoteAddress?: string; remotePort?: number } }) {
        return {
          method: req.method,
          url: sanitizeUrl(req.url),
          hostname: req.headers.host,
          remoteAddress: req.socket?.remoteAddress,
          remotePort: req.socket?.remotePort,
        };
      },
    },
  };
}
