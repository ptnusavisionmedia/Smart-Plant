#pragma once
#include <cmath>

// ---------------------------------------------------------------------------
// Pure soil-moisture calibration math (Tech Spec §4.10 "Kalibrasi kelembapan
// tanah"). No Arduino dependency.
// ---------------------------------------------------------------------------
namespace soil_calibration {

// Linear map from a raw ADC reading to a 0-100% moisture value, calibrated
// against a "dry" (probe in open air) and "wet" (probe saturated in water)
// ADC sample stored in NVS. Many capacitive soil sensors read HIGHER when
// dry and LOWER when wet (and some read the opposite depending on the
// board), so this intentionally does not assume dryAdc < wetAdc: dryAdc
// always maps to 0% and wetAdc always maps to 100%, whichever is larger.
inline float rawToPercent(int rawAdc, int dryAdc, int wetAdc) {
    if (dryAdc == wetAdc) return NAN; // never calibrated / degenerate calibration
    float pct = (static_cast<float>(rawAdc - dryAdc) / static_cast<float>(wetAdc - dryAdc)) * 100.0f;
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;
    return pct;
}

} // namespace soil_calibration
