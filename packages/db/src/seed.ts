import { pathToFileURL } from "node:url";
import { SYSTEM_PLANT_PROFILES, uuidv7 } from "@smart-plant/shared";
import { createDb } from "./client.js";
import { resolveDatabaseFile } from "./env.js";
import { plantProfiles } from "./schema/index.js";
import { eq, and } from "drizzle-orm";

/** Seeds the system plant profiles only — never user or device data (T-10). */
export function seedSystemPlantProfiles(db: ReturnType<typeof createDb>["db"]) {
  const now = Date.now();
  let inserted = 0;

  for (const profile of SYSTEM_PLANT_PROFILES) {
    const existing = db
      .select()
      .from(plantProfiles)
      .where(and(eq(plantProfiles.name, profile.name), eq(plantProfiles.isSystem, true)))
      .get();

    if (existing) continue;

    db.insert(plantProfiles)
      .values({
        id: uuidv7(),
        name: profile.name,
        isSystem: true,
        ownerUserId: null,
        thresholds: JSON.stringify(profile.thresholds),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    inserted += 1;
  }

  return { inserted, skipped: SYSTEM_PLANT_PROFILES.length - inserted };
}

async function main() {
  const file = resolveDatabaseFile();
  const { db, sqlite } = createDb({ file });
  const result = seedSystemPlantProfiles(db);
  console.log(`[db] seed complete: ${result.inserted} inserted, ${result.skipped} already present`);
  sqlite.close();
}

// Only auto-run when executed directly (`pnpm db:seed`), not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
