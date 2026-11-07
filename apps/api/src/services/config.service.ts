import { uuidv7, type UpdateDeviceConfigRequest, type CommandMessage } from "@smart-plant/shared";
import type { Repositories } from "@smart-plant/db";
import { Errors } from "../errors.js";

export type PublishCommand = (deviceId: string, command: CommandMessage) => void;

export function createConfigService(repos: Repositories, publishCommand: PublishCommand) {
  return {
    get(deviceId: string) {
      const config = repos.configs.getByDeviceId(deviceId);
      if (!config) throw Errors.notFound("Konfigurasi perangkat tidak ditemukan");
      return config;
    },

    update(deviceId: string, userId: string, patch: UpdateDeviceConfigRequest) {
      const next = repos.configs.update(deviceId, patch);
      repos.audit.log({ userId, deviceId, action: "device.config.update", metadata: patch });

      publishCommand(deviceId, {
        id: uuidv7(),
        type: "config",
        config: next,
        issuedAt: new Date().toISOString(),
      });

      return next;
    },
  };
}

export type ConfigService = ReturnType<typeof createConfigService>;
