import type { Repositories } from "@smart-plant/db";
import {
  NOTIFICATION_COOLDOWN_MS,
  NOTIFICATION_RETRY_MAX_ATTEMPTS,
  type Status,
  type StatusReason,
  type NotificationType,
} from "@smart-plant/shared";
import { eventBus } from "../realtime/event-bus.js";
import type { FcmSender } from "./fcm.js";

export interface TelegramSender {
  send(chatId: string, text: string): Promise<{ ok: boolean; error?: string }>;
}

const STATUS_LABEL: Record<Status, string> = {
  NORMAL: "Normal",
  WARNING: "Peringatan",
  CRITICAL: "Kritis",
  WATER_LOW: "Air Rendah",
};

const REASON_LABEL: Partial<Record<StatusReason, string>> = {
  SOIL_CRITICAL_DRY: "tanah sangat kering",
  SOIL_CRITICAL_WET: "tanah terlalu basah",
  SOIL_WARNING_DRY: "tanah mulai kering",
  SOIL_WARNING_WET: "tanah agak basah",
  TEMP_CRITICAL_LOW: "suhu sangat rendah",
  TEMP_CRITICAL_HIGH: "suhu sangat tinggi",
  TEMP_WARNING_LOW: "suhu rendah",
  TEMP_WARNING_HIGH: "suhu tinggi",
  HUMIDITY_CRITICAL_LOW: "kelembapan udara sangat rendah",
  HUMIDITY_CRITICAL_HIGH: "kelembapan udara sangat tinggi",
  HUMIDITY_WARNING_LOW: "kelembapan udara rendah",
  HUMIDITY_WARNING_HIGH: "kelembapan udara tinggi",
  WATER_LOW: "air di tangki rendah",
  SENSOR_ERROR: "ada sensor yang gagal membaca",
};

function describeReasons(reasons: StatusReason[]): string {
  const labels = reasons.map((r) => REASON_LABEL[r] ?? r).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "kondisi normal";
}

const cooldowns = new Map<string, number>();

function cooldownKey(deviceId: string, type: NotificationType) {
  return `${deviceId}:${type}`;
}

function shouldBypassCooldown(status: Status): boolean {
  return status === "CRITICAL" || status === "WATER_LOW";
}

function isCooldownActive(deviceId: string, type: NotificationType): boolean {
  const last = cooldowns.get(cooldownKey(deviceId, type));
  return last !== undefined && Date.now() - last < NOTIFICATION_COOLDOWN_MS;
}

function markSent(deviceId: string, type: NotificationType) {
  cooldowns.set(cooldownKey(deviceId, type), Date.now());
}

export function createNotificationService(repos: Repositories, fcm: FcmSender, telegram: TelegramSender) {
  async function dispatch(userId: string, deviceId: string | null, type: NotificationType, title: string, body: string, reasons: StatusReason[], bypassCooldown: boolean) {
    const notification = repos.notifications.create({ userId, deviceId, type, title, body, reasons });

    // In-app/WebSocket: always (Tech Spec §4.7 point 2).
    eventBus.emitToUser(userId, {
      type: "notification",
      notification: {
        id: notification.id,
        deviceId: notification.deviceId,
        type,
        title: notification.title,
        body: notification.body,
        reasons,
        readAt: null,
        createdAt: new Date(notification.createdAt).toISOString(),
      },
    });

    if (deviceId && !bypassCooldown && isCooldownActive(deviceId, type)) {
      return; // push/telegram suppressed by cooldown; in-app already delivered above
    }
    if (deviceId) markSent(deviceId, type);

    const sentChannels: string[] = [];
    let lastError: string | null = null;

    const prefs = repos.notifications.getPreferences(userId);

    if (prefs?.push ?? true) {
      const tokens = repos.notifications.listActivePushTokens(userId).map((t) => t.fcmToken);
      if (tokens.length > 0) {
        const result = await fcm.send(tokens, title, body);
        if (result.ok) sentChannels.push("push");
        else lastError = result.error ?? null;
      }
    }

    if (prefs?.telegram && prefs.telegramChatId) {
      const result = await telegram.send(prefs.telegramChatId, `*${title}*\n${body}`);
      if (result.ok) sentChannels.push("telegram");
      else lastError = result.error ?? lastError;
    }

    repos.notifications.recordDelivery(notification.id, sentChannels, lastError);
  }

  return {
    async notifyStatusChange(userId: string, deviceId: string, status: Status, reasons: StatusReason[], previousStatus?: Status) {
      if (status === "NORMAL" && (!previousStatus || previousStatus === "NORMAL")) return;

      const type: NotificationType = status === "WATER_LOW" ? "WATER_LOW" : "STATUS_CHANGE";
      const title = `Status berubah: ${STATUS_LABEL[status]}`;
      const body =
        status === "NORMAL"
          ? "Perangkat kembali normal."
          : `Terdeteksi ${describeReasons(reasons)}.`;

      await dispatch(userId, deviceId, type, title, body, reasons, shouldBypassCooldown(status));
    },

    async notifyDevicePresence(userId: string, deviceId: string, deviceName: string, online: boolean) {
      const type: NotificationType = online ? "DEVICE_ONLINE" : "DEVICE_OFFLINE";
      const title = online ? `${deviceName} kembali online` : `${deviceName} terputus`;
      const body = online ? "Perangkat kembali terhubung." : "Perangkat tidak mengirim data, periksa koneksi.";
      await dispatch(userId, deviceId, type, title, body, [], true);
    },

    async notifyWateringCompleted(userId: string, deviceId: string, durationSeconds: number) {
      await dispatch(
        userId,
        deviceId,
        "WATERING_COMPLETED",
        "Penyiraman selesai",
        `Pompa menyiram selama ${durationSeconds} detik.`,
        [],
        false,
      );
    },

    async notifyEmergencyStop(userId: string, deviceId: string) {
      await dispatch(userId, deviceId, "EMERGENCY_STOP", "Emergency stop diaktifkan", "Pompa dihentikan dan mode otomatis dimatikan.", [], true);
    },

    /** Retries notifications whose last delivery attempt failed (job notification-retry). */
    async retryPending() {
      const pending = repos.notifications.listPendingRetry(NOTIFICATION_RETRY_MAX_ATTEMPTS);
      for (const n of pending) {
        const prefs = repos.notifications.getPreferences(n.userId);
        const sentChannels: string[] = JSON.parse(n.sentChannels ?? "[]");
        let lastError: string | null = null;

        if ((prefs?.push ?? true) && !sentChannels.includes("push")) {
          const tokens = repos.notifications.listActivePushTokens(n.userId).map((t) => t.fcmToken);
          if (tokens.length > 0) {
            const result = await fcm.send(tokens, n.title, n.body);
            if (result.ok) sentChannels.push("push");
            else lastError = result.error ?? null;
          }
        }
        if (prefs?.telegram && prefs.telegramChatId && !sentChannels.includes("telegram")) {
          const result = await telegram.send(prefs.telegramChatId, `*${n.title}*\n${n.body}`);
          if (result.ok) sentChannels.push("telegram");
          else lastError = result.error ?? lastError;
        }

        repos.notifications.recordDelivery(n.id, sentChannels, lastError);
      }
      return pending.length;
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
