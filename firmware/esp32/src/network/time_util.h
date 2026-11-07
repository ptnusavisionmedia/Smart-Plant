#pragma once
#include <Arduino.h>

// NTP-backed UTC clock helpers. Telemetry/ack/state payloads need a real
// ISO-8601 datetime string (packages/shared's `z.string().datetime()`);
// ESP32 has no RTC, so we sync via NTP once WiFi connects.
namespace time_util {

void begin(); // configTime() against pool.ntp.org, UTC
bool isSynced();

String nowIso8601();
unsigned long long nowEpochMs();
String iso8601FromEpochMs(unsigned long long ms);

} // namespace time_util
