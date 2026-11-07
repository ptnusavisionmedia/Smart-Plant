#pragma once

// DHT22 temperature + humidity driver. Readings are nullable (NAN) on
// failure — never substituted with a fake "normal" value.
namespace dht_sensor {

void begin();

// Fills temperature/humidity with NAN on a failed read instead of throwing,
// so callers can always build a SensorReading from the result.
void read(float& temperatureOut, float& humidityOut);

} // namespace dht_sensor
