#pragma once

// ---------------------------------------------------------------------------
// Smart Plant Emergency Detector — firmware compile-time configuration.
//
// Pin assignments, feature flags and business-rule defaults. Network
// host/port (MQTT_HOST/MQTT_PORT/MQTT_USE_TLS) and the build-variant flags
// (SP_BUILD_PRODUCTION / SP_BUILD_LOCAL / WOKWI_DEMO) are normally injected
// via `-D` build_flags from platformio.ini (see the esp32dev / esp32dev-local
// / esp32dev-wokwi environments). The #ifndef fallbacks below only apply if
// none of those were supplied (e.g. building include/config.h in isolation).
//
// This header has NO Arduino dependency (plain #define/const), so it is safe
// to include from the native unit tests as well as the real firmware.
// ---------------------------------------------------------------------------

// ---- Pin assignments -------------------------------------------------------
// Also wired in diagram.json for the Wokwi demo — keep both in sync.
#define PIN_SOIL_ADC            34  // ADC1_CH6. Wokwi: potentiometer wiper (no capacitive soil part exists in Wokwi's library). Real HW: capacitive soil probe analog out.
#define PIN_DHT                  4  // DHT22 data pin
#define PIN_ULTRASONIC_TRIG      5  // HC-SR04 TRIG
#define PIN_ULTRASONIC_ECHO     18  // HC-SR04 ECHO
#define PIN_FLOAT_SWITCH        19  // INPUT_PULLUP, active LOW = water below float level
#define PIN_EMERGENCY_BUTTON    21  // INPUT_PULLUP, active LOW = pressed. Also wired in hardware as a normally-closed interlock in series with the pump relay supply (see src/control/emergency.cpp).
#define PIN_PUMP_RELAY          23  // OUTPUT, drives the pump relay module (or the demo LED in Wokwi)
#define PIN_STATUS_LED           2  // onboard LED — heartbeat / connection status

#define DHT_SENSOR_TYPE DHT22

// ---- Device identity --------------------------------------------------
#ifndef DEVICE_UID_PREFIX
#define DEVICE_UID_PREFIX "esp32-"
#endif

// ---- WiFi -------------------------------------------------------------
// Real hardware: set to the site's WiFi. Wokwi: "Wokwi-GUEST" is the
// simulator's built-in open AP with real internet egress.
#ifndef WIFI_SSID
#define WIFI_SSID "Wokwi-GUEST"
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif
#define WIFI_CONNECT_TIMEOUT_MS   20000
#define WIFI_RETRY_DELAY_MS        3000

// ---- MQTT ---------------------------------------------------------------
// Overridden per-environment by platformio.ini build_flags.
#ifndef MQTT_HOST
#define MQTT_HOST "localhost"
#endif
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
#ifndef MQTT_USE_TLS
#define MQTT_USE_TLS 0
#endif

#define MQTT_KEEPALIVE_SECONDS      30
#define MQTT_RECONNECT_DELAY_MS   5000
#define MQTT_QOS                    1
#define MQTT_ACK_WAIT_MS          5000

// ---- Business-rule defaults (mirrors packages/shared/src/constants.ts) ----
#define DEFAULT_TARGET_MOISTURE            55.0f
#define DEFAULT_MAX_PUMP_SECONDS            60
#define DEFAULT_COOLDOWN_SECONDS            (30 * 60)
#define DEFAULT_TELEMETRY_INTERVAL_SECONDS  30
#define DEBOUNCE_SAMPLE_COUNT                3
#define OFFLINE_MULTIPLIER                   3
#define WATCHDOG_GRACE_SECONDS                5
#define OFFLINE_BUFFER_CAPACITY             100
#define FLOAT_SWITCH_DEBOUNCE_MS           2000
#define DEFAULT_TANK_HEIGHT_CM              30.0f
#define DEFAULT_TANK_MAX_LEVEL_CM           25.0f
#define DEFAULT_WATER_WARNING_LOW           30.0f
#define DEFAULT_WATER_CRITICAL_LOW          15.0f
#define DEFAULT_SOIL_WARNING_LOW            40.0f

#define FIRMWARE_VERSION "0.1.0"
