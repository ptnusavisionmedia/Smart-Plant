import { and, eq, or } from "drizzle-orm";
import { uuidv7 } from "@smart-plant/shared";
import type { Thresholds } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { plantProfiles } from "../schema/index.js";

export function createProfilesRepository(db: Db) {
  return {
    /** System profiles plus the user's own custom profiles. */
    listForUser(userId: string) {
      return db
        .select()
        .from(plantProfiles)
        .where(or(eq(plantProfiles.isSystem, true), eq(plantProfiles.ownerUserId, userId)))
        .all();
    },

    getById(id: string) {
      return db.select().from(plantProfiles).where(eq(plantProfiles.id, id)).get();
    },

    /** Returns the profile only if it is a system profile or owned by this user — else undefined. */
    getByIdForUser(id: string, userId: string) {
      const row = this.getById(id);
      if (!row) return undefined;
      if (row.isSystem || row.ownerUserId === userId) return row;
      return undefined;
    },

    create(input: { ownerUserId: string; name: string; thresholds: Thresholds }) {
      const now = Date.now();
      const row = {
        id: uuidv7(),
        name: input.name,
        isSystem: false,
        ownerUserId: input.ownerUserId,
        thresholds: JSON.stringify(input.thresholds),
        createdAt: now,
        updatedAt: now,
      };
      db.insert(plantProfiles).values(row).run();
      return row;
    },

    /** Throws if the profile is a system profile — those are read-only (T-15). */
    update(id: string, ownerUserId: string, patch: Partial<{ name: string; thresholds: Thresholds }>) {
      const existing = db
        .select()
        .from(plantProfiles)
        .where(and(eq(plantProfiles.id, id), eq(plantProfiles.ownerUserId, ownerUserId)))
        .get();
      if (!existing || existing.isSystem) {
        throw new Error("Profil sistem tidak dapat diubah");
      }
      db.update(plantProfiles)
        .set({
          name: patch.name,
          thresholds: patch.thresholds ? JSON.stringify(patch.thresholds) : undefined,
          updatedAt: Date.now(),
        })
        .where(eq(plantProfiles.id, id))
        .run();
    },

    delete(id: string, ownerUserId: string) {
      db.delete(plantProfiles)
        .where(and(eq(plantProfiles.id, id), eq(plantProfiles.ownerUserId, ownerUserId)))
        .run();
    },
  };
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>;
