import { evaluateStatus, type Thresholds, type SensorReadingInput, type Status, type StatusReason } from "@smart-plant/shared";
import type { Repositories } from "@smart-plant/db";
import { eventBus } from "../realtime/event-bus.js";
import type { NotificationService } from "./notification.service.js";

export function createStatusService(repos: Repositories, notifications: NotificationService) {
  return {
    /** Tech Spec §4.3 steps 6-8: evaluate, persist on change, notify, broadcast. */
    evaluate(deviceId: string, userId: string | null, reading: SensorReadingInput, thresholds: Thresholds) {
      const { status, reasons } = evaluateStatus(reading, thresholds);
      const previous = repos.events.latestStatusEvent(deviceId);
      const previousReasons = previous ? (JSON.parse(previous.reasons) as StatusReason[]) : [];

      const changed =
        !previous ||
        previous.status !== status ||
        JSON.stringify([...previousReasons].sort()) !== JSON.stringify([...reasons].sort());

      if (changed) {
        repos.events.insertStatusEvent({ deviceId, status, reasons });

        if (userId) {
          eventBus.emitToUser(userId, {
            type: "status",
            deviceId,
            status,
            reasons,
            ts: new Date().toISOString(),
          });
          notifications.notifyStatusChange(userId, deviceId, status, reasons, previous?.status as Status | undefined);
        }
      }

      return { status, reasons, changed };
    },
  };
}

export type StatusService = ReturnType<typeof createStatusService>;
