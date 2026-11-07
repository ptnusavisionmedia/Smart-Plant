import type { FastifyBaseLogger } from "fastify";
import { loadConfig } from "../config.js";

export interface FcmSender {
  send(tokens: string[], title: string, body: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * Firebase Admin SDK is only initialized when real credentials are present
 * (Tech Spec §5 deployment note: a real Firebase project is a manual,
 * account-specific setup step this environment cannot do on your behalf).
 * Without credentials this is a logging no-op so the rest of the system
 * still works end-to-end in local dev.
 */
export function createFcmSender(log: FastifyBaseLogger): FcmSender {
  const config = loadConfig();
  const hasCredentials = Boolean(config.FCM_PROJECT_ID && config.FCM_CLIENT_EMAIL && config.FCM_PRIVATE_KEY);

  if (!hasCredentials) {
    return {
      async send(tokens, title) {
        log.info({ tokens: tokens.length, title }, "[fcm:noop] FCM credentials not configured, skipping push");
        return { ok: false, error: "FCM_NOT_CONFIGURED" };
      },
    };
  }

  return {
    async send(tokens, title, body) {
      try {
        const admin = await import("firebase-admin");
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: config.FCM_PROJECT_ID,
              clientEmail: config.FCM_CLIENT_EMAIL,
              privateKey: config.FCM_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
          });
        }
        await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body } });
        return { ok: true };
      } catch (err) {
        log.error({ err }, "[fcm] send failed");
        return { ok: false, error: (err as Error).message };
      }
    },
  };
}
