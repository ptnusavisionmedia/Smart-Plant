import type { FastifyBaseLogger } from "fastify";
import { loadConfig } from "../config.js";
import type { TelegramSender } from "./notification.service.js";
import type { DeviceService } from "./device.service.js";
import type { WateringService } from "./watering.service.js";
import type { TelegramLinkService } from "./telegram-link.service.js";
import type { Repositories } from "@smart-plant/db";

const STATUS_EMOJI: Record<string, string> = {
  NORMAL: "🟢",
  WARNING: "🟠",
  CRITICAL: "🔴",
  WATER_LOW: "🔵",
};

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

async function callTelegramApi(botToken: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; description?: string; result?: unknown }>;
}

/** Low-level sender, used by notification.service.ts for alert delivery. */
export function createTelegramSender(log: FastifyBaseLogger): TelegramSender {
  const config = loadConfig();
  const botToken = config.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return {
      async send() {
        return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
      },
    };
  }

  return {
    async send(chatId: string, text: string) {
      try {
        const result = await callTelegramApi(botToken, "sendMessage", {
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        });
        if (!result.ok) return { ok: false, error: result.description };
        return { ok: true };
      } catch (err) {
        log.error({ err }, "[telegram] sendMessage failed");
        return { ok: false, error: (err as Error).message };
      }
    },
  };
}

export interface TelegramBotDeps {
  repos: Repositories;
  deviceService: DeviceService;
  wateringService: WateringService;
  telegramLink: TelegramLinkService;
  log: FastifyBaseLogger;
}

/**
 * The interactive side of the bot (T-22 + the user-facing control surface):
 * /start, /link, /unlink, /status, /siram, /stop. Runs as long-polling in
 * local dev (TELEGRAM_MODE=polling) or receives updates via the webhook
 * route in production (TELEGRAM_MODE=webhook) — see routes/integrations.ts.
 */
export function createTelegramBotRunner(deps: TelegramBotDeps) {
  const config = loadConfig();
  const botToken = config.TELEGRAM_BOT_TOKEN;
  let polling = false;
  let offset = 0;

  async function reply(chatId: number, text: string) {
    if (!botToken) return;
    await callTelegramApi(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
  }

  async function handleMessage(chatId: number, text: string) {
    const [command, ...args] = text.trim().split(/\s+/);

    if (command === "/start") {
      await reply(
        chatId,
        "👋 Selamat datang di *Smart Plant Emergency Detector*.\n\n" +
          "Tautkan akun Anda dengan kode dari aplikasi web/mobile (Pengaturan → Telegram):\n" +
          "`/link KODE`\n\n" +
          "Setelah tertaut:\n" +
          "/status — lihat status semua perangkat\n" +
          "/siram <nama_perangkat> [detik] — siram manual\n" +
          "/stop <nama_perangkat> — emergency stop\n" +
          "/unlink — lepaskan tautan akun",
      );
      return;
    }

    if (command === "/link") {
      const code = args[0];
      if (!code) {
        await reply(chatId, "Gunakan format: /link KODE");
        return;
      }
      try {
        deps.telegramLink.consumeLinkCode(code, String(chatId));
        await reply(chatId, "✅ Akun berhasil ditautkan. Anda akan menerima peringatan di sini.");
      } catch {
        await reply(chatId, "❌ Kode tidak valid atau sudah kedaluwarsa.");
      }
      return;
    }

    const userId = deps.repos.notifications.findUserIdByTelegramChatId(String(chatId));
    if (!userId) {
      await reply(chatId, "Akun Anda belum tertaut. Gunakan /link KODE terlebih dahulu.");
      return;
    }

    if (command === "/unlink") {
      deps.telegramLink.unlink(userId);
      await reply(chatId, "Tautan akun telah dilepas.");
      return;
    }

    if (command === "/status") {
      const devices = deps.deviceService.listForUser(userId);
      if (devices.length === 0) {
        await reply(chatId, "Belum ada perangkat yang diklaim.");
        return;
      }
      const lines = devices.map((d) => {
        const emoji = STATUS_EMOJI[d.status] ?? "⚪";
        const soil = d.latest?.soilMoisture !== null && d.latest?.soilMoisture !== undefined ? `${d.latest.soilMoisture.toFixed(0)}%` : "N/A";
        return `${emoji} *${d.name}* — ${d.status} (tanah ${soil}, ${d.isOnline ? "online" : "offline"})`;
      });
      await reply(chatId, lines.join("\n"));
      return;
    }

    if (command === "/siram") {
      const name = args[0];
      const seconds = args[1] ? Number(args[1]) : undefined;
      const device = deps.deviceService.listForUser(userId).find((d) => d.name.toLowerCase() === name?.toLowerCase());
      if (!device) {
        await reply(chatId, "Perangkat tidak ditemukan. Gunakan /status untuk melihat nama perangkat.");
        return;
      }
      try {
        await deps.wateringService.manualWatering(device.id, userId, seconds);
        await reply(chatId, `💧 Penyiraman *${device.name}* dimulai.`);
      } catch (err) {
        await reply(chatId, `❌ Tidak dapat menyiram: ${(err as Error).message}`);
      }
      return;
    }

    if (command === "/stop") {
      const name = args[0];
      const device = deps.deviceService.listForUser(userId).find((d) => d.name.toLowerCase() === name?.toLowerCase());
      if (!device) {
        await reply(chatId, "Perangkat tidak ditemukan. Gunakan /status untuk melihat nama perangkat.");
        return;
      }
      deps.wateringService.emergencyStop(device.id, userId);
      await reply(chatId, `🛑 Emergency stop diaktifkan untuk *${device.name}*.`);
      return;
    }

    await reply(chatId, "Perintah tidak dikenali. Kirim /start untuk melihat daftar perintah.");
  }

  async function processUpdate(update: TelegramUpdate) {
    const chatId = update.message?.chat.id;
    const text = update.message?.text;
    if (!chatId || !text) return;
    try {
      await handleMessage(chatId, text);
    } catch (err) {
      deps.log.error({ err }, "[telegram] failed to handle update");
    }
  }

  async function pollLoop() {
    if (!botToken) return;
    while (polling) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?timeout=25&offset=${offset}`,
        );
        const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
        if (data.ok && data.result) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            await processUpdate(update);
          }
        }
      } catch (err) {
        deps.log.error({ err }, "[telegram] polling error");
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return {
    start() {
      if (!botToken || config.TELEGRAM_MODE !== "polling") return;
      polling = true;
      void pollLoop();
      deps.log.info("[telegram] long-polling started");
    },
    stop() {
      polling = false;
    },
    /** Entry point for the webhook route when TELEGRAM_MODE=webhook. */
    handleWebhookUpdate: processUpdate,
  };
}

