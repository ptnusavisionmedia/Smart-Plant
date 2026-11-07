import { and, desc, eq, sql } from "drizzle-orm";
import { uuidv7 } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { statusEvents, wateringEvents } from "../schema/index.js";

export function createEventsRepository(db: Db) {
  return {
    // --- status events ---

    insertStatusEvent(input: { deviceId: string; status: string; reasons: string[] }) {
      const row = {
        id: uuidv7(),
        deviceId: input.deviceId,
        status: input.status,
        reasons: JSON.stringify(input.reasons),
        createdAt: Date.now(),
      };
      db.insert(statusEvents).values(row).run();
      return row;
    },

    latestStatusEvent(deviceId: string) {
      return db
        .select()
        .from(statusEvents)
        .where(eq(statusEvents.deviceId, deviceId))
        .orderBy(desc(statusEvents.createdAt))
        .limit(1)
        .get();
    },

    /**
     * Batch form of latestStatusEvent — avoids N+1 queries when summarizing a
     * device list (T-52). One correlated-subquery statement rather than one
     * query per device; the subquery reuses idx_status_events_device_created.
     */
    latestStatusEventsByDeviceIds(deviceIds: string[]): Map<string, typeof statusEvents.$inferSelect> {
      if (deviceIds.length === 0) return new Map();
      const ids = sql.join(
        deviceIds.map((id) => sql`${id}`),
        sql`, `,
      );
      // Raw sql bypasses drizzle's column mapping, so alias snake_case columns
      // back to the schema's camelCase field names explicitly.
      const rows = db.all<typeof statusEvents.$inferSelect>(sql`
        SELECT se1.id AS id, se1.device_id AS deviceId, se1.status AS status,
               se1.reasons AS reasons, se1.created_at AS createdAt
        FROM status_events se1
        WHERE se1.device_id IN (${ids})
          AND se1.created_at = (
            SELECT MAX(se2.created_at) FROM status_events se2 WHERE se2.device_id = se1.device_id
          )
      `);
      return new Map(rows.map((row) => [row.deviceId, row]));
    },

    listStatusEvents(deviceId: string, limit = 50) {
      return db
        .select()
        .from(statusEvents)
        .where(eq(statusEvents.deviceId, deviceId))
        .orderBy(desc(statusEvents.createdAt))
        .limit(limit)
        .all();
    },

    // --- watering events ---

    startWatering(input: {
      deviceId: string;
      trigger: "auto" | "manual" | "emergency";
      commandId: string | null;
    }) {
      const row = {
        id: uuidv7(),
        deviceId: input.deviceId,
        trigger: input.trigger,
        commandId: input.commandId,
        startedAt: Date.now(),
        endedAt: null as number | null,
        durationSeconds: null as number | null,
        status: "running" as const,
      };
      db.insert(wateringEvents).values(row).run();
      return row;
    },

    findRunningByCommandId(commandId: string) {
      return db
        .select()
        .from(wateringEvents)
        .where(and(eq(wateringEvents.commandId, commandId), eq(wateringEvents.status, "running")))
        .get();
    },

    findRunningByDevice(deviceId: string) {
      return db
        .select()
        .from(wateringEvents)
        .where(and(eq(wateringEvents.deviceId, deviceId), eq(wateringEvents.status, "running")))
        .get();
    },

    closeWatering(id: string, status: "completed" | "stopped" | "rejected" | "timeout") {
      const row = db.select().from(wateringEvents).where(eq(wateringEvents.id, id)).get();
      if (!row) return undefined;
      const endedAt = Date.now();
      const durationSeconds = Math.round((endedAt - row.startedAt) / 1000);
      db.update(wateringEvents)
        .set({ endedAt, durationSeconds, status })
        .where(eq(wateringEvents.id, id))
        .run();
      return { ...row, endedAt, durationSeconds, status };
    },

    listForDevice(deviceId: string, limit = 50) {
      return db
        .select()
        .from(wateringEvents)
        .where(eq(wateringEvents.deviceId, deviceId))
        .orderBy(desc(wateringEvents.startedAt))
        .limit(limit)
        .all();
    },

    /** Most recent completed/stopped watering end time, for cooldown checks. */
    lastCompletedEndTime(deviceId: string): number | null {
      const rows = db
        .select()
        .from(wateringEvents)
        .where(eq(wateringEvents.deviceId, deviceId))
        .orderBy(desc(wateringEvents.startedAt))
        .limit(10)
        .all();
      const lastEnded = rows.find((r) => r.status === "completed" || r.status === "stopped");
      return lastEnded?.endedAt ?? null;
    },
  };
}

export type EventsRepository = ReturnType<typeof createEventsRepository>;
