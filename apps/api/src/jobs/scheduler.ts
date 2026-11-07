import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { runOfflineDetector } from "./offline-detector.js";
import { runDailyRollup } from "./daily-rollup.js";
import { runRetention } from "./retention.js";
import { runNotificationRetry } from "./notification-retry.js";

const OFFLINE_DETECTOR_INTERVAL_MS = 30_000;
const NOTIFICATION_RETRY_INTERVAL_MS = 5 * 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNextUtc(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * V1 uses simple in-process timers rather than an external scheduler
 * (Tech Spec §5 — single instance). Each job is wrapped so a thrown error
 * never kills the interval/timeout.
 */
export default fp(async function schedulerPlugin(app: FastifyInstance) {
  const timers: Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>> = [];

  function safeRun(name: string, fn: () => void | Promise<void>) {
    try {
      const result = fn();
      if (result instanceof Promise) result.catch((err) => app.log.error({ err }, `[jobs] ${name} failed`));
    } catch (err) {
      app.log.error({ err }, `[jobs] ${name} failed`);
    }
  }

  timers.push(setInterval(() => safeRun("offline-detector", () => runOfflineDetector(app)), OFFLINE_DETECTOR_INTERVAL_MS));
  timers.push(setInterval(() => safeRun("notification-retry", () => runNotificationRetry(app)), NOTIFICATION_RETRY_INTERVAL_MS));

  function scheduleAt(hour: number, minute: number, name: string, fn: () => void) {
    const delay = msUntilNextUtc(hour, minute);
    timers.push(
      setTimeout(() => {
        safeRun(name, fn);
        timers.push(setInterval(() => safeRun(name, fn), DAY_MS));
      }, delay),
    );
  }

  scheduleAt(0, 10, "daily-rollup", () => runDailyRollup(app));
  scheduleAt(1, 0, "retention", () => runRetention(app));

  app.addHook("onClose", (_instance, done) => {
    for (const timer of timers) clearTimeout(timer as ReturnType<typeof setTimeout>);
    done();
  });
},
{ name: "schedulerPlugin", dependencies: ["dbPlugin", "servicesPlugin"] },
);
