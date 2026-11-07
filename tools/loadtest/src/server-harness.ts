import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "@smart-plant/db";

/**
 * Boots a real `apps/api` server in a child process against a throwaway
 * SQLite file, for load-testing the actual HTTP surface rather than a mock.
 * MQTT_URL points at a closed port — the mqtt.js client retries in the
 * background without blocking boot (same behavior relied on throughout this
 * project's manual testing, since no broker is available in this sandbox).
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const apiDir = join(repoRoot, "apps", "api");
const tsxCli = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const migrationsFolder = join(repoRoot, "packages", "db", "migrations");

function migrateFreshDb(dbFile: string): void {
  const { db, sqlite } = createDb({ file: dbFile });
  migrate(db, { migrationsFolder });
  sqlite.close();
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (!address || typeof address === "string") {
        reject(new Error("could not determine free port"));
        return;
      }
      const { port } = address;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

export interface ServerHarness {
  baseUrl: string;
  dbFile: string;
  stop(): Promise<void>;
}

export interface BootOptions {
  /** Forward the child's stdout/stderr to this process — off by default to keep load-test output readable. */
  verboseLogs?: boolean;
  /** Point the bridge at a real broker (required for loadtest:ws) instead of the default unreachable one. */
  mqttUrl?: string;
}

export async function bootApiServer(opts: BootOptions = {}): Promise<ServerHarness> {
  const port = await findFreePort();
  const workDir = mkdtempSync(join(tmpdir(), "smart-plant-loadtest-"));
  const dbFile = join(workDir, "smartplant.db");
  migrateFreshDb(dbFile);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: opts.verboseLogs ? "info" : "error",
    API_HOST: "127.0.0.1",
    API_PORT: String(port),
    API_PUBLIC_URL: `http://127.0.0.1:${port}`,
    CORS_ALLOWED_ORIGINS: "http://localhost:3000",
    DATABASE_FILE: dbFile,
    JWT_ACCESS_SECRET: randomBytes(24).toString("hex"),
    JWT_REFRESH_SECRET: randomBytes(24).toString("hex"),
    INTERNAL_MQTT_SHARED_SECRET: randomBytes(16).toString("hex"),
    // Deliberately unreachable by default — see module docstring.
    MQTT_URL: opts.mqttUrl ?? "mqtt://127.0.0.1:1",
    TELEGRAM_MODE: "disabled",
  };

  const child: ChildProcess = spawn(process.execPath, [tsxCli, "src/server.ts"], {
    cwd: apiDir,
    env,
    stdio: opts.verboseLogs ? "inherit" : "pipe",
  });

  let startupError = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    startupError += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl, child);

  return {
    baseUrl,
    dbFile,
    async stop() {
      child.kill();
      await new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
        setTimeout(resolve, 3000);
      });
      rmSync(workDir, { recursive: true, force: true });
    },
  };

  async function waitForReady(url: string, proc: ChildProcess): Promise<void> {
    const deadline = Date.now() + 30_000;
    let exitCode: number | null | undefined;
    proc.once("exit", (code) => {
      exitCode = code;
    });
    while (Date.now() < deadline) {
      if (exitCode !== undefined) {
        throw new Error(`api server exited early (code ${exitCode}): ${startupError}`);
      }
      try {
        // Not /ready: it also requires a connected MQTT broker (see health.ts),
        // which this harness deliberately doesn't have — see module docstring.
        const res = await fetch(`${url}/health`);
        if (res.ok) return;
      } catch {
        // not listening yet
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`api server did not become ready within 30s: ${startupError}`);
  }
}
