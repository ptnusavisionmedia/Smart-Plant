import mqtt from "mqtt";
import {
  MQTT_TOPIC,
  CommandMessageSchema,
  type CommandMessage,
  type TelemetryMessage,
} from "@smart-plant/shared";

/**
 * Device simulator (T-50): impersonates one ESP32 over MQTT to exercise the
 * full ingest → status → WebSocket/notification pipeline without real
 * hardware. Credentials come from `tools/provision-device.ts`'s output.
 *
 * Usage:
 *   pnpm --filter @smart-plant/device-simulator sim -- \
 *     --deviceUid=esp32-sim-01 --secret=<mqttSecret> \
 *     [--url=mqtt://localhost:1883] [--scenario=normal] [--interval=5]
 *
 * Scenarios: normal | dry | water-low | sensor-error | offline-reconnect
 */

interface Args {
  deviceUid: string;
  secret: string;
  url: string;
  scenario: string;
  intervalSeconds: number;
}

function parseArgs(): Args {
  const flags: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--([a-zA-Z]+)=(.*)$/.exec(arg);
    if (match) flags[match[1]!] = match[2]!;
  }

  if (!flags.deviceUid || !flags.secret) {
    console.error(
      "Usage: tsx src/index.ts --deviceUid=<uid> --secret=<mqttSecret> [--url=mqtt://localhost:1883] [--scenario=normal] [--interval=5]",
    );
    process.exit(1);
  }

  return {
    deviceUid: flags.deviceUid,
    secret: flags.secret,
    url: flags.url ?? "mqtt://localhost:1883",
    scenario: flags.scenario ?? "normal",
    intervalSeconds: flags.interval ? Number(flags.interval) : 5,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Simulated plant physics: soil dries slowly, recovers fast when watered. */
class SensorState {
  soilMoisture = 55;
  temperature = 26;
  humidity = 62;
  waterLevel = 80;
  pumpOn = false;
  sensorErrorTick = 0;

  constructor(private readonly scenario: string) {
    if (scenario === "water-low") this.waterLevel = 12;
    if (scenario === "dry") this.soilMoisture = 45;
  }

  tick(): void {
    const dryRate = this.scenario === "dry" ? 1.2 : 0.15;
    if (this.pumpOn) {
      this.soilMoisture = clamp(this.soilMoisture + 3, 0, 100);
      this.waterLevel = clamp(this.waterLevel - 0.8, 0, 100);
    } else {
      this.soilMoisture = clamp(this.soilMoisture - dryRate - Math.random() * 0.3, 0, 100);
    }

    this.temperature = clamp(this.temperature + (Math.random() - 0.5) * 0.6, -5, 45);
    this.humidity = clamp(this.humidity + (Math.random() - 0.5) * 2, 0, 100);

    if (this.scenario === "sensor-error") {
      this.sensorErrorTick += 1;
    }
  }

  toReading(): Pick<TelemetryMessage, "soilMoisture" | "temperature" | "humidity" | "waterLevel" | "waterLevelCm"> {
    const soilFails = this.scenario === "sensor-error" && this.sensorErrorTick % 4 === 0;
    return {
      soilMoisture: soilFails ? null : Math.round(this.soilMoisture * 10) / 10,
      temperature: Math.round(this.temperature * 10) / 10,
      humidity: Math.round(this.humidity * 10) / 10,
      waterLevel: Math.round(this.waterLevel * 10) / 10,
      waterLevelCm: Math.round(((this.waterLevel / 100) * 25) * 10) / 10,
    };
  }
}

function main() {
  const args = parseArgs();
  const topics = {
    telemetry: MQTT_TOPIC.telemetry(args.deviceUid),
    presence: MQTT_TOPIC.presence(args.deviceUid),
    command: MQTT_TOPIC.command(args.deviceUid),
    ack: MQTT_TOPIC.ack(args.deviceUid),
    state: MQTT_TOPIC.state(args.deviceUid),
  };

  const sensors = new SensorState(args.scenario);
  let autoMode = false;
  let emergencyLatched = false;
  let configVersion = 1;
  let historicalBuffer: TelemetryMessage[] = [];

  const client = mqtt.connect(args.url, {
    username: args.deviceUid,
    password: args.secret,
    clientId: `sim-${args.deviceUid}`,
    reconnectPeriod: 3000,
    will: { topic: topics.presence, payload: "offline", qos: 1, retain: false },
  });

  function publishState() {
    client.publish(
      topics.state,
      JSON.stringify({
        pumpOn: sensors.pumpOn,
        autoMode,
        emergencyLatched,
        configVersion,
        ts: new Date().toISOString(),
      }),
      { qos: 1 },
    );
  }

  function publishTelemetry(historical = false) {
    const message: TelemetryMessage = {
      deviceUid: args.deviceUid,
      ts: new Date().toISOString(),
      ...sensors.toReading(),
      waterLevelSource: "ultrasonic",
      pumpOn: sensors.pumpOn,
      firmwareVersion: "sim-1.0.0",
      historical,
    };
    client.publish(topics.telemetry, JSON.stringify(message), { qos: 1 });
    console.log(`[sim] telemetry soil=${message.soilMoisture} temp=${message.temperature} water=${message.waterLevel} pump=${message.pumpOn}`);
  }

  function handleCommand(raw: Buffer) {
    let command: CommandMessage;
    try {
      command = CommandMessageSchema.parse(JSON.parse(raw.toString("utf8")));
    } catch (err) {
      console.error("[sim] invalid command payload", err);
      return;
    }

    console.log(`[sim] command received: ${command.type}`);

    if (command.type === "pump") {
      if (command.action === "start") {
        if (emergencyLatched) {
          client.publish(topics.ack, JSON.stringify({ id: command.id, ok: false, state: "rejected", error: "EMERGENCY_STOP" }), { qos: 1 });
          return;
        }
        sensors.pumpOn = true;
        client.publish(topics.ack, JSON.stringify({ id: command.id, ok: true, state: "on" }), { qos: 1 });
        publishState();
        const durationMs = (command.durationSeconds ?? 10) * 1000;
        setTimeout(() => {
          sensors.pumpOn = false;
          publishState();
          console.log("[sim] pump stopped (duration elapsed)");
        }, durationMs);
      } else {
        sensors.pumpOn = false;
        client.publish(topics.ack, JSON.stringify({ id: command.id, ok: true, state: "off" }), { qos: 1 });
        publishState();
      }
      return;
    }

    if (command.type === "emergency_stop") {
      sensors.pumpOn = false;
      emergencyLatched = true;
      autoMode = false;
      client.publish(topics.ack, JSON.stringify({ id: command.id, ok: true, state: "off" }), { qos: 1 });
      publishState();
      return;
    }

    if (command.type === "emergency_reset") {
      emergencyLatched = false;
      autoMode = command.resumeAutoMode;
      client.publish(topics.ack, JSON.stringify({ id: command.id, ok: true, state: "accepted" }), { qos: 1 });
      publishState();
      return;
    }

    if (command.type === "config") {
      configVersion = command.config.configVersion;
      client.publish(topics.ack, JSON.stringify({ id: command.id, ok: true, state: "accepted" }), { qos: 1 });
      publishState();
    }
  }

  client.on("connect", () => {
    console.log(`[sim] connected as ${args.deviceUid} (scenario=${args.scenario})`);
    client.subscribe(topics.command, { qos: 1 });
    client.publish(topics.presence, "online", { qos: 1 });

    if (args.scenario === "offline-reconnect" && historicalBuffer.length > 0) {
      console.log(`[sim] replaying ${historicalBuffer.length} buffered readings`);
      for (const reading of historicalBuffer) {
        client.publish(topics.telemetry, JSON.stringify({ ...reading, historical: true }), { qos: 1 });
      }
      historicalBuffer = [];
    }

    publishState();
  });

  client.on("error", (err) => console.error("[sim] connection error:", err.message));
  client.on("close", () => console.log("[sim] disconnected"));
  client.on("message", (topic, payload) => {
    if (topic === topics.command) handleCommand(payload);
  });

  const tickTimer = setInterval(() => {
    sensors.tick();
    if (args.scenario === "offline-reconnect" && !client.connected) {
      historicalBuffer.push({
        deviceUid: args.deviceUid,
        ts: new Date().toISOString(),
        ...sensors.toReading(),
        waterLevelSource: "ultrasonic",
        pumpOn: sensors.pumpOn,
        historical: true,
      });
      if (historicalBuffer.length > 100) historicalBuffer.shift();
      return;
    }
    publishTelemetry();
  }, args.intervalSeconds * 1000);

  if (args.scenario === "offline-reconnect") {
    setTimeout(() => {
      console.log("[sim] simulating a 20s offline gap");
      client.end(true);
      setTimeout(() => {
        client.reconnect();
      }, 20_000);
    }, args.intervalSeconds * 1000 * 3);
  }

  function shutdown() {
    console.log("[sim] shutting down");
    clearInterval(tickTimer);
    client.publish(topics.presence, "offline", { qos: 1 }, () => {
      client.end(false, {}, () => process.exit(0));
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
