import { randomUUID } from "node:crypto";
import { bootApiServer } from "./server-harness.js";
import { seedDevicesAndReadings } from "./seed.js";
import { computeStats, formatStats } from "./stats.js";

/**
 * HTTP latency/throughput load test (T-52) — boots a real apps/api server
 * against a throwaway SQLite DB, seeds N devices with realistic reading
 * history, then hammers the read/write endpoints the Tech Spec's p95 <500ms
 * budget is about, for a fixed duration and concurrency.
 *
 * Usage: pnpm --filter @smart-plant/loadtest loadtest:http -- \
 *          --devices=100 --duration=20 --concurrency=20
 */

interface Args {
  devices: number;
  duration: number;
  concurrency: number;
  verbose: boolean;
}

function parseArgs(): Args {
  const args: Args = { devices: 100, duration: 20, concurrency: 20, verbose: false };
  for (const raw of process.argv.slice(2)) {
    if (raw === "--verbose") args.verbose = true;
    const [key, value] = raw.replace(/^--/, "").split("=");
    if (key === "devices" && value) args.devices = Number(value);
    if (key === "duration" && value) args.duration = Number(value);
    if (key === "concurrency" && value) args.concurrency = Number(value);
  }
  return args;
}

type Endpoint = "list_devices" | "get_device" | "get_readings";

async function main() {
  const args = parseArgs();
  console.log(`[loadtest:http] booting api server (devices=${args.devices}, duration=${args.duration}s, concurrency=${args.concurrency})`);

  const server = await bootApiServer({ verboseLogs: args.verbose });
  try {
    const email = `loadtest-${randomUUID()}@example.invalid`;
    const password = "Loadtest123!";

    const registerRes = await fetch(`${server.baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Load Test User", email, password }),
    });
    if (!registerRes.ok) throw new Error(`register failed: ${registerRes.status} ${await registerRes.text()}`);
    const registered = (await registerRes.json()) as { id: string };

    console.log(`[loadtest:http] seeding ${args.devices} devices with reading history...`);
    const seedStart = performance.now();
    const devices = seedDevicesAndReadings(server.dbFile, {
      userId: registered.id,
      deviceCount: args.devices,
      readingsPerDevice: 240, // ~2h at a 30s interval, the default telemetry cadence
      intervalSeconds: 30,
    });
    console.log(`[loadtest:http] seeded in ${((performance.now() - seedStart) / 1000).toFixed(1)}s`);

    const loginRes = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status} ${await loginRes.text()}`);
    const { accessToken } = (await loginRes.json()) as { accessToken: string };
    const authHeaders = { authorization: `Bearer ${accessToken}` };

    const samplesByEndpoint: Record<Endpoint, number[]> = {
      list_devices: [],
      get_device: [],
      get_readings: [],
    };
    let totalRequests = 0;
    let totalErrors = 0;

    const deadline = performance.now() + args.duration * 1000;

    async function worker() {
      while (performance.now() < deadline) {
        const device = devices[Math.floor(Math.random() * devices.length)]!;
        // Weighted roughly like real traffic: the dashboard list is hit most,
        // a device detail view next, and its history chart least often.
        const roll = Math.random();
        const endpoint: Endpoint = roll < 0.5 ? "list_devices" : roll < 0.85 ? "get_device" : "get_readings";
        const path =
          endpoint === "list_devices"
            ? "/api/v1/devices"
            : endpoint === "get_device"
              ? `/api/v1/devices/${device.deviceId}`
              : `/api/v1/devices/${device.deviceId}/readings`;

        const started = performance.now();
        try {
          const res = await fetch(`${server.baseUrl}${path}`, { headers: authHeaders });
          const elapsed = performance.now() - started;
          totalRequests += 1;
          if (!res.ok) {
            totalErrors += 1;
          } else {
            samplesByEndpoint[endpoint].push(elapsed);
          }
          await res.arrayBuffer(); // drain body
        } catch {
          totalRequests += 1;
          totalErrors += 1;
        }
      }
    }

    console.log(`[loadtest:http] running for ${args.duration}s with ${args.concurrency} concurrent workers...`);
    const runStart = performance.now();
    await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
    const elapsedSeconds = (performance.now() - runStart) / 1000;

    console.log("");
    console.log("=== HTTP load test report ===");
    console.log(`total requests: ${totalRequests} (${totalErrors} errors), ${(totalRequests / elapsedSeconds).toFixed(1)} req/s`);
    for (const [endpoint, samples] of Object.entries(samplesByEndpoint)) {
      console.log(formatStats(endpoint, computeStats(samples)));
    }
  } finally {
    await server.stop();
  }
}

main().catch((err) => {
  console.error("[loadtest:http] failed:", err);
  process.exit(1);
});
