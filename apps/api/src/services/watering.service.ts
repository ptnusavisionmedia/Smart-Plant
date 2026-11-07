import { uuidv7, validateManualWatering, type AckMessage } from "@smart-plant/shared";
import { OFFLINE_MULTIPLIER, WATERING_ACK_TIMEOUT_MS, DEFAULT_MANUAL_WATERING_SECONDS } from "@smart-plant/shared";
import type { Repositories } from "@smart-plant/db";
import { Errors } from "../errors.js";
import { eventBus } from "../realtime/event-bus.js";
import { latestState } from "../realtime/latest-state.js";
import type { PublishCommand } from "./config.service.js";
import type { NotificationService } from "./notification.service.js";
import { ackLatencyTracker } from "../metrics.js";

interface PendingAck {
  resolve: (ack: AckMessage) => void;
  timer: ReturnType<typeof setTimeout>;
  issuedAt: number;
}

export function createWateringService(
  repos: Repositories,
  publishCommand: PublishCommand,
  notifications: NotificationService,
) {
  const pendingAcks = new Map<string, PendingAck>();

  function isDeviceOnline(deviceId: string, telemetryIntervalSeconds: number): boolean {
    const device = repos.devices.findById(deviceId);
    if (!device || !device.lastSeenAt) return false;
    return Date.now() - device.lastSeenAt <= telemetryIntervalSeconds * 1000 * OFFLINE_MULTIPLIER;
  }

  const service = {
    /** Tech Spec §4.5 — manual watering with a 5s ack wait. */
    async manualWatering(deviceId: string, userId: string, durationSeconds = DEFAULT_MANUAL_WATERING_SECONDS) {
      const device = repos.devices.findByIdForUser(deviceId, userId);
      if (!device) throw Errors.notFound("Perangkat tidak ditemukan");
      const config = repos.configs.getByDeviceId(deviceId);
      if (!config) throw Errors.notFound("Konfigurasi perangkat tidak ditemukan");

      const live = latestState.get(deviceId);
      const decision = validateManualWatering({
        durationSeconds,
        maxPumpSeconds: config.maxPumpSeconds,
        emergencyLatched: device.emergencyLatched,
        water: { waterLevel: live?.waterLevel ?? null, waterLevelSource: config.waterLevelSource, thresholds: config.thresholds },
        isOnline: isDeviceOnline(deviceId, config.telemetryIntervalSeconds),
      });

      if (!decision.allowed) {
        const map = {
          WATER_LOW: Errors.conflict("WATER_LOW", "Tangki air rendah, penyiraman diblokir"),
          EMERGENCY_STOP: Errors.conflict("EMERGENCY_STOP", "Perangkat dalam mode emergency stop"),
          DEVICE_OFFLINE: Errors.conflict("DEVICE_OFFLINE", "Perangkat sedang offline"),
          INVALID_DURATION: Errors.badRequest("Durasi penyiraman tidak valid"),
        } as const;
        throw map[decision.reason as keyof typeof map] ?? Errors.badRequest("Tidak dapat menyiram saat ini");
      }

      const commandId = uuidv7();
      repos.events.startWatering({ deviceId, trigger: "manual", commandId });
      repos.audit.log({ userId, deviceId, action: "device.watering.manual", metadata: { durationSeconds, commandId } });

      publishCommand(deviceId, {
        id: commandId,
        type: "pump",
        action: "start",
        durationSeconds,
        issuedAt: new Date().toISOString(),
      });

      try {
        const ack = await this.waitForAck(commandId);
        if (!ack.ok) {
          const event = repos.events.findRunningByCommandId(commandId);
          if (event) repos.events.closeWatering(event.id, "rejected");
          return { commandId, accepted: false, state: "rejected" as const };
        }
        eventBus.emitToUser(userId, {
          type: "watering",
          deviceId,
          state: "running",
          trigger: "manual",
          endsAt: new Date(Date.now() + durationSeconds * 1000).toISOString(),
        });
        return { commandId, accepted: true, state: "running" as const };
      } catch {
        const event = repos.events.findRunningByCommandId(commandId);
        if (event) repos.events.closeWatering(event.id, "timeout");
        throw Errors.timeout("Perangkat tidak merespons dalam 5 detik");
      }
    },

    waitForAck(commandId: string): Promise<AckMessage> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingAcks.delete(commandId);
          reject(new Error("ack timeout"));
        }, WATERING_ACK_TIMEOUT_MS);
        pendingAcks.set(commandId, { resolve, timer, issuedAt: Date.now() });
      });
    },

    /** Called by the MQTT bridge when sp/{deviceId}/ack arrives. */
    handleAck(ack: AckMessage) {
      const pending = pendingAcks.get(ack.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingAcks.delete(ack.id);
      ackLatencyTracker.record(Date.now() - pending.issuedAt);
      pending.resolve(ack);
    },

    /** Called by the MQTT bridge when sp/{deviceId}/state reports the pump turned off, closing the running event. */
    handlePumpStopped(deviceId: string, userId: string | null) {
      const running = repos.events.findRunningByDevice(deviceId);
      if (!running) return;
      const closed = repos.events.closeWatering(running.id, "completed");
      if (userId && closed) {
        eventBus.emitToUser(userId, {
          type: "watering",
          deviceId,
          state: "completed",
          trigger: running.trigger,
          endsAt: null,
        });
        notifications.notifyWateringCompleted(userId, deviceId, closed.durationSeconds ?? 0);
      }
    },

    emergencyStop(deviceId: string, userId: string) {
      const device = repos.devices.findByIdForUser(deviceId, userId);
      if (!device) throw Errors.notFound("Perangkat tidak ditemukan");

      repos.devices.setEmergencyLatched(deviceId, true);
      repos.audit.log({ userId, deviceId, action: "device.emergency_stop" });

      const running = repos.events.findRunningByDevice(deviceId);
      if (running) repos.events.closeWatering(running.id, "stopped");

      publishCommand(deviceId, { id: uuidv7(), type: "emergency_stop", issuedAt: new Date().toISOString() });
      notifications.notifyEmergencyStop(userId, deviceId);
    },

    emergencyReset(deviceId: string, userId: string, resumeAutoMode: boolean) {
      const device = repos.devices.findByIdForUser(deviceId, userId);
      if (!device) throw Errors.notFound("Perangkat tidak ditemukan");

      repos.devices.setEmergencyLatched(deviceId, false);
      if (resumeAutoMode) repos.devices.setAutoMode(deviceId, true);
      repos.audit.log({ userId, deviceId, action: "device.emergency_reset", metadata: { resumeAutoMode } });

      publishCommand(deviceId, {
        id: uuidv7(),
        type: "emergency_reset",
        resumeAutoMode,
        issuedAt: new Date().toISOString(),
      });
    },
  };

  return service;
}

export type WateringService = ReturnType<typeof createWateringService>;
