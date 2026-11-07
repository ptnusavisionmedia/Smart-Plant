#pragma once

// WiFi connection with retry (Tech Spec §4.9 / T-31). Non-blocking after the
// initial connect attempt: call loop() periodically to reconnect if dropped.
namespace wifi_net {

void begin();
bool isConnected();
void loop();

} // namespace wifi_net
