#include "soil.h"
#include "soil_calibration.h"
#include "../../include/config.h"
#include <Arduino.h>
#include <Preferences.h>

namespace soil_sensor {

static Preferences prefs;
static int g_dryAdc = 4095; // factory default: driest = highest raw ADC
static int g_wetAdc = 0;    // factory default: wettest = lowest raw ADC

void begin() {
    pinMode(PIN_SOIL_ADC, INPUT);
    loadCalibration();
}

void loadCalibration() {
    prefs.begin("soilcal", /*readOnly=*/true);
    g_dryAdc = prefs.getInt("dry", 4095);
    g_wetAdc = prefs.getInt("wet", 0);
    prefs.end();
}

void calibrateDry() {
    g_dryAdc = readRawAdc();
    prefs.begin("soilcal", false);
    prefs.putInt("dry", g_dryAdc);
    prefs.end();
}

void calibrateWet() {
    g_wetAdc = readRawAdc();
    prefs.begin("soilcal", false);
    prefs.putInt("wet", g_wetAdc);
    prefs.end();
}

int readRawAdc() {
    return analogRead(PIN_SOIL_ADC);
}

float readPercent() {
    return soil_calibration::rawToPercent(readRawAdc(), g_dryAdc, g_wetAdc);
}

int dryAdc() { return g_dryAdc; }
int wetAdc() { return g_wetAdc; }

} // namespace soil_sensor
