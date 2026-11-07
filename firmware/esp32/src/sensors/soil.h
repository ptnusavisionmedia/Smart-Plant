#pragma once

// Soil moisture driver: raw ADC read + NVS-backed dry/wet calibration.
// Wokwi substitution: a potentiometer stands in for the capacitive soil
// sensor (Wokwi's part library has no soil moisture sensor) — see WOKWI.md.
namespace soil_sensor {

void begin();

// Reads the current calibration from NVS (namespace "soilcal"). Falls back
// to factory defaults (dry=4095 i.e. max ADC/driest, wet=0 i.e. min ADC/wettest)
// if never calibrated.
void loadCalibration();

// Calibration routine: call with the probe in open air, then in saturated
// soil/water, to capture the two reference ADC values and persist them.
void calibrateDry();
void calibrateWet();

int readRawAdc();

// Raw ADC -> 0-100% using the stored calibration (soil_calibration::rawToPercent).
float readPercent();

int dryAdc();
int wetAdc();

} // namespace soil_sensor
