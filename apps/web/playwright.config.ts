import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { E2E_WEB_PORT, E2E_API_PORT, E2E_DB_FILE } from "./e2e/fixtures.js";

const tsxCli = fileURLToPath(new URL("./node_modules/tsx/dist/cli.mjs", import.meta.url));
const apiDir = fileURLToPath(new URL("../api", import.meta.url));
const seedScript = fileURLToPath(new URL("./e2e/seed-db.ts", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${E2E_WEB_PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      // Seed script runs to completion (and fully releases the db file)
      // before the server process starts — two sequential tsx processes,
      // never nested, so there's no race over the sqlite file.
      command: `node "${tsxCli}" "${seedScript}" && node "${tsxCli}" src/server.ts`,
      cwd: apiDir,
      url: `http://127.0.0.1:${E2E_API_PORT}/health`,
      timeout: 30_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        NODE_ENV: "test",
        LOG_LEVEL: "error",
        API_HOST: "127.0.0.1",
        API_PORT: String(E2E_API_PORT),
        API_PUBLIC_URL: `http://127.0.0.1:${E2E_API_PORT}`,
        CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${E2E_WEB_PORT}`,
        DATABASE_FILE: E2E_DB_FILE,
        JWT_ACCESS_SECRET: "e2e-access-secret-aaaaaaaaaaaaaaaa",
        JWT_REFRESH_SECRET: "e2e-refresh-secret-aaaaaaaaaaaaaaaa",
        INTERNAL_MQTT_SHARED_SECRET: "e2e-internal-secret",
        // Deliberately unreachable — no MQTT broker in this sandbox, see
        // tools/loadtest/src/server-harness.ts for the same approach.
        MQTT_URL: "mqtt://127.0.0.1:1",
        TELEGRAM_MODE: "disabled",
      },
    },
    {
      command: `npx next dev --port ${E2E_WEB_PORT}`,
      url: `http://127.0.0.1:${E2E_WEB_PORT}`,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${E2E_API_PORT}`,
        NEXT_PUBLIC_WS_URL: `ws://127.0.0.1:${E2E_API_PORT}/ws`,
      },
    },
  ],
});
