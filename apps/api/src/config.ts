import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().default(3001),
  API_PUBLIC_URL: z.string().default("http://localhost:3001"),
  WEB_PUBLIC_URL: z.string().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_FILE: z.string().default("./infra/data/smartplant.db"),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().default(2592000),

  INTERNAL_MQTT_SHARED_SECRET: z.string().min(8),

  MQTT_URL: z.string().default("mqtt://localhost:1883"),
  MQTT_BRIDGE_USERNAME: z.string().default("api-bridge"),
  MQTT_BRIDGE_PASSWORD: z.string().default(""),

  MAIL_FROM: z.string().default("Smart Plant <no-reply@smartplant.local>"),
  MAIL_DRIVER: z.enum(["dev", "smtp"]).default("dev"),

  FCM_PROJECT_ID: z.string().optional().default(""),
  FCM_CLIENT_EMAIL: z.string().optional().default(""),
  FCM_PRIVATE_KEY: z.string().optional().default(""),

  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(""),
  TELEGRAM_MODE: z.enum(["polling", "webhook", "disabled"]).default("disabled"),

  SENTRY_DSN_API: z.string().optional().default(""),
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  corsAllowedOrigins: string[];
};

let cached: AppConfig | undefined;

/** Validates process.env once (fail-fast per T-04) and caches the result. */
export function loadConfig(): AppConfig {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[config] invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const env = parsed.data;
  cached = {
    ...env,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  };
  return cached;
}
