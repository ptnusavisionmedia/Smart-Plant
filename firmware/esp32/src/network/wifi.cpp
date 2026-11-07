#include "wifi.h"
#include "time_util.h"
#include "../../include/config.h"
#include <Arduino.h>
#include <WiFi.h>

namespace wifi_net {

namespace {
unsigned long g_lastRetryMs = 0;
bool g_ntpStarted = false;
}

void begin() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start) < WIFI_CONNECT_TIMEOUT_MS) {
        delay(250);
    }

    if (WiFi.status() == WL_CONNECTED) {
        time_util::begin();
        g_ntpStarted = true;
    }
    g_lastRetryMs = millis();
}

bool isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void loop() {
    if (isConnected()) {
        if (!g_ntpStarted) {
            time_util::begin();
            g_ntpStarted = true;
        }
        return;
    }

    unsigned long now = millis();
    if (now - g_lastRetryMs >= WIFI_RETRY_DELAY_MS) {
        g_lastRetryMs = now;
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
}

} // namespace wifi_net
