import { and, eq, isNull, isNotNull, gt } from "drizzle-orm";
import { uuidv7 } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { devices } from "../schema/index.js";

export function createDevicesRepository(db: Db) {
  return {
    /** For the MQTT auth/ACL internal endpoints — not scoped to a user. */
    findByDeviceUid(deviceUid: string) {
      return db.select().from(devices).where(eq(devices.deviceUid, deviceUid)).get();
    },

    findById(id: string) {
      return db.select().from(devices).where(eq(devices.id, id)).get();
    },

    /** Ownership-scoped lookup — every device route must use this, never findById alone. */
    findByIdForUser(id: string, userId: string) {
      return db
        .select()
        .from(devices)
        .where(and(eq(devices.id, id), eq(devices.userId, userId)))
        .get();
    },

    listForUser(userId: string) {
      return db.select().from(devices).where(eq(devices.userId, userId)).all();
    },

    /** All claimed devices — used by the daily-rollup job. */
    listAllClaimed() {
      return db.select().from(devices).where(isNotNull(devices.userId)).all();
    },

    findUnclaimedByClaimCodeHash(claimCodeHash: string) {
      return db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.claimCodeHash, claimCodeHash),
            isNull(devices.userId),
            gt(devices.claimCodeExpiresAt, Date.now()),
          ),
        )
        .get();
    },

    /** Factory/provisioning step — creates an unclaimed device record with a pairing code. */
    provision(input: {
      deviceUid: string;
      claimCodeHash: string;
      claimCodeExpiresAt: number;
      mqttSecretHash: string;
    }) {
      const now = Date.now();
      const row = {
        id: uuidv7(),
        userId: null as string | null,
        name: input.deviceUid,
        location: null as string | null,
        deviceUid: input.deviceUid,
        claimCodeHash: input.claimCodeHash,
        claimCodeExpiresAt: input.claimCodeExpiresAt,
        mqttSecretHash: input.mqttSecretHash,
        plantProfileId: null as string | null,
        firmwareVersion: null as string | null,
        lastSeenAt: null as number | null,
        isOnline: false,
        autoMode: false,
        emergencyLatched: false,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(devices).values(row).run();
      return row;
    },

    claim(id: string, input: { userId: string; name: string; location: string | null; plantProfileId: string | null }) {
      db.update(devices)
        .set({
          userId: input.userId,
          name: input.name,
          location: input.location,
          plantProfileId: input.plantProfileId,
          claimCodeHash: null,
          claimCodeExpiresAt: null,
          updatedAt: Date.now(),
        })
        .where(eq(devices.id, id))
        .run();
    },

    update(id: string, patch: Partial<{ name: string; location: string | null; plantProfileId: string | null }>) {
      db.update(devices).set({ ...patch, updatedAt: Date.now() }).where(eq(devices.id, id)).run();
    },

    unclaim(id: string) {
      db.update(devices)
        .set({ userId: null, updatedAt: Date.now() })
        .where(eq(devices.id, id))
        .run();
    },

    setPresence(id: string, online: boolean, lastSeenAt: number) {
      db.update(devices).set({ isOnline: online, lastSeenAt, updatedAt: Date.now() }).where(eq(devices.id, id)).run();
    },

    setAutoMode(id: string, autoMode: boolean) {
      db.update(devices).set({ autoMode, updatedAt: Date.now() }).where(eq(devices.id, id)).run();
    },

    setEmergencyLatched(id: string, emergencyLatched: boolean) {
      db.update(devices)
        .set({ emergencyLatched, autoMode: emergencyLatched ? false : undefined, updatedAt: Date.now() })
        .where(eq(devices.id, id))
        .run();
    },

    setFirmwareVersion(id: string, firmwareVersion: string) {
      db.update(devices).set({ firmwareVersion, updatedAt: Date.now() }).where(eq(devices.id, id)).run();
    },

    /** Devices whose last_seen_at is older than the given cutoff and are still marked online (offline-detector job). */
    listStaleOnline(cutoff: number) {
      return db
        .select()
        .from(devices)
        .where(eq(devices.isOnline, true))
        .all()
        .filter((d) => d.lastSeenAt !== null && d.lastSeenAt < cutoff);
    },
  };
}

export type DevicesRepository = ReturnType<typeof createDevicesRepository>;
