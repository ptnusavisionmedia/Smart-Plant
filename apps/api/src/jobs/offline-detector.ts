import type { FastifyInstance } from "fastify";
import { OFFLINE_MULTIPLIER } from "@smart-plant/shared";
import { eventBus } from "../realtime/event-bus.js";
import { latestState } from "../realtime/latest-state.js";

/** Marks devices offline once they've exceeded telemetryIntervalSeconds * OFFLINE_MULTIPLIER without a message. */
export function runOfflineDetector(app: FastifyInstance) {
  const defaultIntervalSeconds = 30;
  const cutoff = Date.now() - defaultIntervalSeconds * 1000 * OFFLINE_MULTIPLIER;
  const stale = app.repos.devices.listStaleOnline(cutoff);

  for (const device of stale) {
    const config = app.repos.configs.getByDeviceId(device.id);
    const deviceCutoff = Date.now() - (config?.telemetryIntervalSeconds ?? defaultIntervalSeconds) * 1000 * OFFLINE_MULTIPLIER;
    if (!device.lastSeenAt || device.lastSeenAt >= deviceCutoff) continue;

    app.repos.devices.setPresence(device.id, false, device.lastSeenAt);
    latestState.update(device.id, { isOnline: false });

    if (device.userId) {
      eventBus.emitToUser(device.userId, {
        type: "device_presence",
        deviceId: device.id,
        online: false,
        lastSeenAt: new Date(device.lastSeenAt).toISOString(),
      });
      void app.services.notification.notifyDevicePresence(device.userId, device.id, device.name, false);
    }
  }
}
