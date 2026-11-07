import mqtt from "mqtt";

/**
 * MQTT ingest-rate load test (T-52) — connects N virtual devices and
 * publishes telemetry at a target aggregate rate (e.g. 200 msg/s across 100
 * devices), measuring the rate actually achieved and the broker's PUBACK
 * round-trip latency.
 *
 * Needs a real broker — `infra/docker-compose.yml` (full mosquitto-go-auth
 * stack) or `infra/docker-compose.local-simple.yml` (static-auth fallback)
 * with devices pre-provisioned via `tools/provision-device.ts` and their
 * credentials passed in `--credentialsFile`. NOT executed in this sandbox:
 * no Docker daemon is available here (see `tools/device-simulator/README.md`
 * for the same limitation). Run it against a real broker as part of staging
 * verification before relying on these numbers.
 *
 * Usage:
 *   pnpm --filter @smart-plant/loadtest loadtest:mqtt -- \
 *     --url=mqtt://localhost:1883 --devices=100 --rate=200 --duration=30 \
 *     --credentialsFile=./devices.json
 *
 * credentialsFile: JSON array of { deviceUid, mqttSecret }, as printed by
 * `tools/provision-device.ts`. Without it, connects with no credentials,
 * which only works against a broker configured to allow anonymous clients.
 */

interface Args {
  url: string;
  devices: number;
  rate: number;
  duration: number;
  credentialsFile?: string;
}

function parseArgs(): Args {
  const args: Args = { url: "mqtt://localhost:1883", devices: 100, rate: 200, duration: 30 };
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    if (key === "url" && value) args.url = value;
    if (key === "devices" && value) args.devices = Number(value);
    if (key === "rate" && value) args.rate = Number(value);
    if (key === "duration" && value) args.duration = Number(value);
    if (key === "credentialsFile" && value) args.credentialsFile = value;
  }
  return args;
}

async function loadCredentials(file: string | undefined): Promise<Array<{ deviceUid: string; mqttSecret: string }>> {
  if (!file) return [];
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(file, "utf-8"));
}

function telemetryPayload(historical = false) {
  return JSON.stringify({
    deviceUid: "placeholder",
    ts: new Date().toISOString(),
    soilMoisture: 40 + Math.random() * 20,
    temperature: 26 + Math.random() * 4,
    humidity: 55 + Math.random() * 15,
    waterLevel: 60 + Math.random() * 30,
    waterLevelCm: 18 + Math.random() * 6,
    waterLevelSource: "ultrasonic",
    pumpOn: false,
    historical,
  });
}

async function main() {
  const args = parseArgs();
  const credentials = await loadCredentials(args.credentialsFile);

  const deviceUids = Array.from(
    { length: args.devices },
    (_, i) => credentials[i]?.deviceUid ?? `loadtest-sim-${i}`,
  );

  console.log(`[loadtest:mqtt] connecting ${args.devices} virtual devices to ${args.url}...`);
  const clients = deviceUids.map((deviceUid, i) =>
    mqtt.connect(args.url, {
      clientId: `loadtest-${deviceUid}-${process.pid}`,
      username: deviceUid,
      password: credentials[i]?.mqttSecret,
      reconnectPeriod: 0, // a dropped connection should fail this run loudly, not retry silently
      connectTimeout: 10_000,
    }),
  );

  try {
    await Promise.all(
      clients.map(
        (client, i) =>
          new Promise<void>((resolve, reject) => {
            client.once("connect", () => resolve());
            client.once("error", (err) => reject(new Error(`${deviceUids[i]}: ${err.message}`)));
          }),
      ),
    );
  } catch (err) {
    console.error("[loadtest:mqtt] connection failed — is a broker running at", args.url, "?");
    console.error(String(err));
    for (const c of clients) c.end(true);
    process.exit(1);
  }
  console.log("[loadtest:mqtt] all devices connected");

  const perDeviceIntervalMs = (args.devices * 1000) / args.rate;
  let published = 0;
  let acked = 0;
  const ackLatenciesMs: number[] = [];

  const timers = clients.map((client, i) =>
    setInterval(() => {
      const sentAt = performance.now();
      const payload = telemetryPayload();
      client.publish(`sp/${deviceUids[i]}/telemetry`, payload, { qos: 1 }, (err) => {
        if (!err) {
          acked += 1;
          ackLatenciesMs.push(performance.now() - sentAt);
        }
      });
      published += 1;
    }, perDeviceIntervalMs),
  );

  await new Promise((r) => setTimeout(r, args.duration * 1000));
  for (const t of timers) clearInterval(t);
  await new Promise((r) => setTimeout(r, 1000)); // drain in-flight PUBACKs
  for (const c of clients) c.end(true);

  const { computeStats, formatStats } = await import("./stats.js");
  console.log("");
  console.log("=== MQTT ingest load test report ===");
  console.log(`target: ${args.rate} msg/s across ${args.devices} devices for ${args.duration}s`);
  console.log(`published: ${published} (${(published / args.duration).toFixed(1)} msg/s), acked: ${acked}`);
  console.log(formatStats("puback_latency", computeStats(ackLatenciesMs)));
}

main().catch((err) => {
  console.error("[loadtest:mqtt] failed:", err);
  process.exit(1);
});
