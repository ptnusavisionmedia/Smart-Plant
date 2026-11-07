import { randomUUID } from "node:crypto";
import mqtt from "mqtt";
import WebSocket from "ws";
import { bootApiServer } from "./server-harness.js";
import { seedDevicesAndReadings } from "./seed.js";
import { computeStats, formatStats } from "./stats.js";

/**
 * WebSocket fan-out latency test (T-52) — boots a real apps/api server
 * wired to a real broker, publishes telemetry as N owned devices over MQTT,
 * and measures the delay until each `reading` event lands on the owning
 * user's WebSocket connection (MQTT publish -> bridge -> eventBus -> ws-hub
 * -> socket.send), end to end.
 *
 * Needs a real, reachable MQTT broker — see `tools/device-simulator/README.md`
 * and `mqtt-ingest.ts` for the same constraint. NOT executed in this sandbox
 * (no Docker daemon available here); run it against a real broker as part
 * of staging verification.
 *
 * Usage:
 *   pnpm --filter @smart-plant/loadtest loadtest:ws -- \
 *     --mqttUrl=mqtt://localhost:1883 --devices=20 --duration=20
 */

interface Args {
  mqttUrl: string;
  devices: number;
  duration: number;
}

function parseArgs(): Args {
  const args: Args = { mqttUrl: "mqtt://localhost:1883", devices: 20, duration: 20 };
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    if (key === "mqttUrl" && value) args.mqttUrl = value;
    if (key === "devices" && value) args.devices = Number(value);
    if (key === "duration" && value) args.duration = Number(value);
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const server = await bootApiServer({ mqttUrl: args.mqttUrl });

  try {
    const email = `ws-loadtest-${randomUUID()}@example.invalid`;
    const password = "Loadtest123!";
    const registerRes = await fetch(`${server.baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "WS Load Test User", email, password }),
    });
    if (!registerRes.ok) throw new Error(`register failed: ${registerRes.status}`);
    const registered = (await registerRes.json()) as { id: string };

    const devices = seedDevicesAndReadings(server.dbFile, {
      userId: registered.id,
      deviceCount: args.devices,
      readingsPerDevice: 0,
      intervalSeconds: 30,
    });

    const loginRes = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    const wsUrl = `${server.baseUrl.replace(/^http/, "ws")}/ws?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    console.log("[loadtest:ws] websocket connected");

    const pending = new Map<string, number>(); // deviceId -> publishedAt
    const latenciesMs: number[] = [];
    ws.on("message", (raw: Buffer) => {
      const event = JSON.parse(raw.toString());
      if (event.type !== "reading") return;
      const publishedAt = pending.get(event.deviceId);
      if (publishedAt === undefined) return;
      pending.delete(event.deviceId);
      latenciesMs.push(performance.now() - publishedAt);
    });

    console.log(`[loadtest:ws] connecting ${args.devices} device publishers to ${args.mqttUrl}...`);
    const clients = devices.map((d) =>
      mqtt.connect(args.mqttUrl, { username: d.deviceUid, password: d.mqttSecret, reconnectPeriod: 0, connectTimeout: 10_000 }),
    );
    await Promise.all(
      clients.map(
        (client, i) =>
          new Promise<void>((resolve, reject) => {
            client.once("connect", () => resolve());
            client.once("error", (err) => reject(new Error(`${devices[i]!.deviceUid}: ${err.message}`)));
          }),
      ),
    );

    const deadline = performance.now() + args.duration * 1000;
    while (performance.now() < deadline) {
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i]!;
        pending.set(device.deviceId, performance.now());
        clients[i]!.publish(
          `sp/${device.deviceUid}/telemetry`,
          JSON.stringify({
            deviceUid: device.deviceUid,
            ts: new Date().toISOString(),
            soilMoisture: 40 + Math.random() * 20,
            temperature: 26 + Math.random() * 4,
            humidity: 55 + Math.random() * 15,
            waterLevel: 60 + Math.random() * 30,
            waterLevelCm: 18 + Math.random() * 6,
            waterLevelSource: "ultrasonic",
            pumpOn: false,
          }),
          { qos: 1 },
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    await new Promise((r) => setTimeout(r, 1000)); // drain

    for (const c of clients) c.end(true);
    ws.close();

    console.log("");
    console.log("=== WebSocket fan-out latency report ===");
    console.log(`published rounds matched: ${latenciesMs.length}, unmatched (dropped or still in flight): ${pending.size}`);
    console.log(formatStats("publish_to_ws_delivery", computeStats(latenciesMs)));
  } finally {
    await server.stop();
  }
}

main().catch((err) => {
  console.error("[loadtest:ws] failed:", err);
  process.exit(1);
});
