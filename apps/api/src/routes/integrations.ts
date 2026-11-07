import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";
import { Errors } from "../errors.js";
import { userIdFromRequest } from "../plugins/auth.js";
import type { TelegramUpdate } from "../services/telegram.js";

export default async function integrationRoutes(app: FastifyInstance) {
  app.post("/integrations/telegram/link", { preHandler: app.authenticate }, async (req) => {
    const userId = userIdFromRequest(req);
    const code = app.services.telegramLink.createLinkCode(userId);
    return { code, expiresInSeconds: 600 };
  });

  app.delete("/integrations/telegram/link", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = userIdFromRequest(req);
    app.services.telegramLink.unlink(userId);
    reply.code(204);
  });

  app.post("/integrations/telegram/webhook", async (req, reply) => {
    const config = loadConfig();
    const providedSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (!config.TELEGRAM_WEBHOOK_SECRET || providedSecret !== config.TELEGRAM_WEBHOOK_SECRET) {
      throw Errors.unauthorized("Webhook secret tidak valid");
    }
    await app.services.telegramBot.handleWebhookUpdate(req.body as TelegramUpdate);
    reply.code(200);
    return { ok: true };
  });
}
