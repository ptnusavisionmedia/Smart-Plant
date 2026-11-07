import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";
import { createMailer } from "../services/mailer.js";
import { createAuthService, type AuthService } from "../services/auth.service.js";
import { createDeviceService, type DeviceService } from "../services/device.service.js";
import { createConfigService, type ConfigService } from "../services/config.service.js";
import { createFcmSender } from "../services/fcm.js";
import { createTelegramSender, createTelegramBotRunner } from "../services/telegram.js";
import { createNotificationService, type NotificationService } from "../services/notification.service.js";
import { createTelegramLinkService, type TelegramLinkService } from "../services/telegram-link.service.js";
import { createWateringService, type WateringService } from "../services/watering.service.js";
import { createStatusService, type StatusService } from "../services/status.service.js";
import { createHistoryService, type HistoryService } from "../services/history.service.js";
import { mqttPublishHolder } from "../realtime/mqtt-publish-holder.js";

export interface Services {
  auth: AuthService;
  device: DeviceService;
  config: ConfigService;
  notification: NotificationService;
  telegramLink: TelegramLinkService;
  watering: WateringService;
  status: StatusService;
  history: HistoryService;
  telegramBot: ReturnType<typeof createTelegramBotRunner>;
}

declare module "fastify" {
  interface FastifyInstance {
    services: Services;
  }
}

export default fp(
  async function servicesPlugin(app: FastifyInstance) {
    const config = loadConfig();
    const publishCommand = (deviceId: string, command: Parameters<typeof mqttPublishHolder.publish>[1]) =>
      mqttPublishHolder.publish(deviceId, command);

    const mailer = createMailer(app.log);
    const fcm = createFcmSender(app.log);
    const telegramSender = createTelegramSender(app.log);

    const auth = createAuthService(app.repos, mailer, (payload) => app.jwt.sign(payload, { expiresIn: config.JWT_ACCESS_TTL_SECONDS }), config.API_PUBLIC_URL);
    const device = createDeviceService(app.repos);
    const configService = createConfigService(app.repos, publishCommand);
    const notification = createNotificationService(app.repos, fcm, telegramSender);
    const telegramLink = createTelegramLinkService(app.repos);
    const watering = createWateringService(app.repos, publishCommand, notification);
    const status = createStatusService(app.repos, notification);
    const history = createHistoryService(app.repos);

    const telegramBot = createTelegramBotRunner({
      repos: app.repos,
      deviceService: device,
      wateringService: watering,
      telegramLink,
      log: app.log,
    });

    app.decorate("services", {
      auth,
      device,
      config: configService,
      notification,
      telegramLink,
      watering,
      status,
      history,
      telegramBot,
    });

    telegramBot.start();
    app.addHook("onClose", (_instance, done) => {
      telegramBot.stop();
      done();
    });
  },
  { name: "servicesPlugin", dependencies: ["dbPlugin", "authPlugin"] },
);
