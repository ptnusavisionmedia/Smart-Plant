import type { Db } from "../client.js";
import { createUsersRepository } from "./users.js";
import { createDevicesRepository } from "./devices.js";
import { createConfigsRepository } from "./configs.js";
import { createReadingsRepository } from "./readings.js";
import { createEventsRepository } from "./events.js";
import { createNotificationsRepository } from "./notifications.js";
import { createProfilesRepository } from "./profiles.js";
import { createAuditRepository } from "./audit.js";

export * from "./users.js";
export * from "./devices.js";
export * from "./configs.js";
export * from "./readings.js";
export * from "./events.js";
export * from "./notifications.js";
export * from "./profiles.js";
export * from "./audit.js";

/** Single entry point so services never import individual repo factories directly. */
export function createRepositories(db: Db) {
  return {
    users: createUsersRepository(db),
    devices: createDevicesRepository(db),
    configs: createConfigsRepository(db),
    readings: createReadingsRepository(db),
    events: createEventsRepository(db),
    notifications: createNotificationsRepository(db),
    profiles: createProfilesRepository(db),
    audit: createAuditRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
