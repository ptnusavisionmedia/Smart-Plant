import { desc, eq } from "drizzle-orm";
import { uuidv7 } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { auditLogs } from "../schema/index.js";

export function createAuditRepository(db: Db) {
  return {
    log(input: {
      userId: string | null;
      deviceId: string | null;
      action: string;
      metadata?: Record<string, unknown>;
    }) {
      const row = {
        id: uuidv7(),
        userId: input.userId,
        deviceId: input.deviceId,
        action: input.action,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt: Date.now(),
      };
      db.insert(auditLogs).values(row).run();
      return row;
    },

    listForDevice(deviceId: string, limit = 100) {
      return db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.deviceId, deviceId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .all();
    },

    listForUser(userId: string, limit = 100) {
      return db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .all();
    },
  };
}

export type AuditRepository = ReturnType<typeof createAuditRepository>;
