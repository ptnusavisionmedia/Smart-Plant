import type { CommandMessage } from "@smart-plant/shared";

export type Publisher = (deviceId: string, command: CommandMessage) => void;

/**
 * Indirection so services (built before the MQTT client connects) can still
 * capture a stable publish function — the mqtt plugin replaces `.publish`
 * once connected. Avoids a bootstrap chicken-and-egg between services.ts and
 * plugins/mqtt.ts.
 */
export const mqttPublishHolder: { publish: Publisher } = {
  publish: (deviceId, command) => {
    console.warn(`[mqtt] not connected yet, dropping command ${command.type} for device ${deviceId}`);
  },
};
