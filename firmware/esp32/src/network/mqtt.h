#pragma once
#include <Arduino.h>
#include <functional>
#include "../sensors/sensors.h"

// ---------------------------------------------------------------------------
// MQTT client (T-31). Topics match packages/shared/src/constants.ts exactly:
//   sp/{deviceId}/telemetry  (device -> broker, QoS 1)
//   sp/{deviceId}/presence   (device -> broker, LWT "offline" / "online" plain string)
//   sp/{deviceId}/command    (broker -> device, QoS 1)
//   sp/{deviceId}/ack        (device -> broker, QoS 1)
//   sp/{deviceId}/state      (device -> broker, QoS 1)
// ---------------------------------------------------------------------------
namespace mqtt_client {

using CommandHandler = std::function<void(const String& payload)>;

void begin(const String& deviceUid);
void setCommandHandler(CommandHandler handler);

bool isConnected();

// Call every loop() iteration: drives (re)connect with LWT, PubSubClient's
// internal loop(), and replays the offline buffer once reconnected.
void loop();

void publishTelemetry(const SensorReading& reading, const String& isoTimestamp);
void publishAck(const String& id, bool ok, const String& state, const String& error = "");
void publishState(bool pumpOn, bool autoMode, bool emergencyLatched, int configVersion, const String& isoTimestamp);

} // namespace mqtt_client
