import fp from "fastify-plugin";
import mqtt from "mqtt";
import type { FastifyInstance } from "fastify";
import {
  TelemetryMessageSchema,
  PresenceMessageSchema,
  AckMessageSchema,
  DeviceStateMessageSchema,
  evaluateStatus,
  type Thresholds,
} from "@smart-plant/shared";
import type { InsertReadingInput } from "@smart-plant/db";
import { loadConfig } from "../config.js";
import { mqttPublishHolder } from "../realtime/mqtt-publish-holder.js";
import { latestState } from "../realtime/latest-state.js";
import { eventBus } from "../realtime/event-bus.js";

export interface MqttMetrics {
  messagesIn: number;
  validationFailed: number;
  statusTransitions: number;
  connected: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    mqttMetrics: MqttMetrics;
  }
}

const BATCH_FLUSH_MS = 100;
const BATCH_MAX_SIZE = 100;

function parseTopic(topic: string): { deviceUid: string; channel: string } | null {
  const match = /^sp\/([^/]+)\/([^/]+)$/.exec(topic);
  if (!match) return null;
  return { deviceUid: match[1]!, channel: match[2]! };
}

export default fp(
  async function mqttPlugin(app: FastifyInstance) {
    const config = loadConfig();
    const client = mqtt.connect(config.MQTT_URL, {
      username: config.MQTT_BRIDGE_USERNAME,
      password: config.MQTT_BRIDGE_PASSWORD,
      clientId: `api-bridge-${process.pid}`,
      reconnectPeriod: 2000,
    });

    const metrics: MqttMetrics = { messagesIn: 0, validationFailed: 0, statusTransitions: 0, connected: false };
    app.decorate("mqttMetrics", metrics);

    let pendingReadings: InsertReadingInput[] = [];
    const flushTimer = setInterval(() => {
      if (pendingReadings.length === 0) return;
      const batch = pendingReadings;
      pendingReadings = [];
      try {
        app.repos.readings.insertBatch(batch);
      } catch (err) {
        app.log.error({ err }, "[mqtt] failed to flush reading batch");
      }
    }, BATCH_FLUSH_MS);

    function queueReading(row: InsertReadingInput) {
      pendingReadings.push(row);
      if (pendingReadings.length >= BATCH_MAX_SIZE) {
        const batch = pendingReadings;
        pendingReadings = [];
        app.repos.readings.insertBatch(batch);
      }
    }

    client.on("connect", () => {
      metrics.connected = true;
      app.log.info("[mqtt] bridge connected");
      client.subscribe(["sp/+/telemetry", "sp/+/presence", "sp/+/ack", "sp/+/state"], { qos: 1 });
    });

    client.on("close", () => {
      metrics.connected = false;
    });

    client.on("error", (err) => app.log.error({ err }, "[mqtt] connection error"));

    client.on("message", (topic, payloadBuf) => {
      metrics.messagesIn += 1;
      const parsedTopic = parseTopic(topic);
      if (!parsedTopic) return;
      const { deviceUid, channel } = parsedTopic;
      const payloadText = payloadBuf.toString("utf8");

      try {
        if (channel === "telemetry") handleTelemetry(deviceUid, payloadText);
        else if (channel === "presence") handlePresence(deviceUid, payloadText);
        else if (channel === "ack") handleAck(payloadText);
        else if (channel === "state") handleState(deviceUid, payloadText);
      } catch (err) {
        metrics.validationFailed += 1;
        app.log.warn({ err, topic }, "[mqtt] failed to process message");
      }
    });

    function handleTelemetry(deviceUid: string, payloadText: string) {
      const message = TelemetryMessageSchema.parse(JSON.parse(payloadText));
      if (message.deviceUid !== deviceUid) {
        metrics.validationFailed += 1;
        app.log.warn({ deviceUid, payloadDeviceUid: message.deviceUid }, "[mqtt] device_uid mismatch");
        return;
      }

      const device = app.repos.devices.findByDeviceUid(deviceUid);
      if (!device) {
        app.log.warn({ deviceUid }, "[mqtt] telemetry from unknown device");
        return;
      }

      const config = app.repos.configs.getByDeviceId(device.id);
      const thresholds: Thresholds = config?.thresholds ?? {
        soil: { criticalLow: 25, warningLow: 40, warningHigh: 71, criticalHigh: 85 },
        temp: { criticalLow: 15, warningLow: 18, warningHigh: 31, criticalHigh: 35 },
        humidity: { criticalLow: 40, warningLow: 50, warningHigh: 71, criticalHigh: 80 },
        water: { warningLow: 30, criticalLow: 15 },
      };

      const reading = {
        soilMoisture: message.soilMoisture,
        temperature: message.temperature,
        humidity: message.humidity,
        waterLevel: message.waterLevel,
      };
      const { status } = evaluateStatus(reading, thresholds);

      const timeMs = Date.parse(message.ts);
      queueReading({
        deviceId: device.id,
        time: Number.isFinite(timeMs) ? timeMs : Date.now(),
        soilMoisture: message.soilMoisture,
        temperature: message.temperature,
        humidity: message.humidity,
        waterLevel: message.waterLevel,
        waterLevelCm: message.waterLevelCm,
        waterLevelSource: message.waterLevelSource,
        pumpOn: message.pumpOn,
        status,
        raw: payloadText,
      });

      const wasOnline = device.isOnline;
      app.repos.devices.setPresence(device.id, true, Date.now());

      latestState.update(device.id, {
        soilMoisture: message.soilMoisture,
        temperature: message.temperature,
        humidity: message.humidity,
        waterLevel: message.waterLevel,
        pumpOn: message.pumpOn,
        ts: Date.now(),
        isOnline: true,
        lastSeenAt: Date.now(),
      });

      if (device.userId) {
        eventBus.emitToUser(device.userId, {
          type: "reading",
          deviceId: device.id,
          data: {
            soilMoisture: message.soilMoisture,
            temperature: message.temperature,
            humidity: message.humidity,
            waterLevel: message.waterLevel,
            pumpOn: message.pumpOn,
            ts: message.ts,
          },
        });

        const result = app.services.status.evaluate(device.id, device.userId, reading, thresholds);
        if (result.changed) metrics.statusTransitions += 1;

        if (!wasOnline) {
          eventBus.emitToUser(device.userId, {
            type: "device_presence",
            deviceId: device.id,
            online: true,
            lastSeenAt: new Date().toISOString(),
          });
          void app.services.notification.notifyDevicePresence(device.userId, device.id, device.name, true);
        }
      }
    }

    function handlePresence(deviceUid: string, payloadText: string) {
      const presence = PresenceMessageSchema.parse(payloadText.trim());
      const device = app.repos.devices.findByDeviceUid(deviceUid);
      if (!device) return;

      const online = presence === "online";
      app.repos.devices.setPresence(device.id, online, Date.now());
      latestState.update(device.id, { isOnline: online, lastSeenAt: Date.now() });

      if (device.userId) {
        eventBus.emitToUser(device.userId, {
          type: "device_presence",
          deviceId: device.id,
          online,
          lastSeenAt: new Date().toISOString(),
        });
        if (!online) void app.services.notification.notifyDevicePresence(device.userId, device.id, device.name, false);
      }
    }

    function handleAck(payloadText: string) {
      const ack = AckMessageSchema.parse(JSON.parse(payloadText));
      app.services.watering.handleAck(ack);
    }

    function handleState(deviceUid: string, payloadText: string) {
      const state = DeviceStateMessageSchema.parse(JSON.parse(payloadText));
      const device = app.repos.devices.findByDeviceUid(deviceUid);
      if (!device) return;

      if (!state.pumpOn) {
        app.services.watering.handlePumpStopped(device.id, device.userId);
      }
      if (state.emergencyLatched !== device.emergencyLatched) {
        app.repos.devices.setEmergencyLatched(device.id, state.emergencyLatched);
      }
      if (!state.emergencyLatched && state.autoMode !== device.autoMode) {
        app.repos.devices.setAutoMode(device.id, state.autoMode);
      }

      const config = app.repos.configs.getRawByDeviceId(device.id);
      if (config && config.configVersion === state.configVersion && !config.acceptedAt) {
        app.repos.configs.markAccepted(device.id, state.configVersion);
      }
    }

    mqttPublishHolder.publish = (deviceId, command) => {
      const device = app.repos.devices.findById(deviceId);
      if (!device) return;
      client.publish(`sp/${device.deviceUid}/command`, JSON.stringify(command), { qos: 1 });
    };

    app.addHook("onClose", (_instance, done) => {
      clearInterval(flushTimer);
      // client.end()'s callback is not guaranteed to fire promptly while the
      // client is mid-reconnect against an unreachable broker — shutdown
      // must not hang on that, so force a close after a short grace period.
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        done();
      };
      client.end(false, {}, finish);
      setTimeout(finish, 2000);
    });
  },
  { name: "mqttPlugin", dependencies: ["dbPlugin", "servicesPlugin"] },
);
