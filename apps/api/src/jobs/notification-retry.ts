import type { FastifyInstance } from "fastify";

/** Retries push/Telegram delivery for notifications whose last attempt failed. */
export async function runNotificationRetry(app: FastifyInstance) {
  const count = await app.services.notification.retryPending();
  if (count > 0) app.log.info({ count }, "[notification-retry] retried pending notifications");
}
