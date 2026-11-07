import { randomBytes, createHash } from "node:crypto";
import type { Repositories } from "@smart-plant/db";
import { TELEGRAM_LINK_CODE_TTL_MS } from "@smart-plant/shared";
import { Errors } from "../errors.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** One-time Telegram link codes, 10-minute TTL (Tech Spec §5 "kode tautan sekali pakai 10 menit"). */
export function createTelegramLinkService(repos: Repositories) {
  return {
    createLinkCode(userId: string): string {
      const code = randomBytes(4).toString("hex").toUpperCase();
      repos.notifications.setTelegramLinkCode(userId, sha256(code), Date.now() + TELEGRAM_LINK_CODE_TTL_MS);
      return code;
    },

    /** Called from the Telegram bot when a user sends /link <code>. Never logs the raw chatId elsewhere. */
    consumeLinkCode(code: string, chatId: string): { userId: string } {
      const prefs = repos.notifications.findByTelegramLinkCodeHash(sha256(code));
      if (!prefs || !prefs.telegramLinkCodeExpiresAt || prefs.telegramLinkCodeExpiresAt < Date.now()) {
        throw Errors.badRequest("Kode tautan tidak valid atau sudah kedaluwarsa");
      }
      repos.notifications.linkTelegram(prefs.userId, chatId);
      return { userId: prefs.userId };
    },

    unlink(userId: string) {
      repos.notifications.unlinkTelegram(userId);
    },
  };
}

export type TelegramLinkService = ReturnType<typeof createTelegramLinkService>;
