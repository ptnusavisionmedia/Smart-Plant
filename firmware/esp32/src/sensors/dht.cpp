#include "dht.h"
#include "../../include/config.h"
#include <Arduino.h>
#include <DHT.h>
#include <cmath>

namespace dht_sensor {

static DHT dht(PIN_DHT, DHT_SENSOR_TYPE);

void begin() {
    dht.begin();
}

void read(float& temperatureOut, float& humidityOut) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    temperatureOut = std::isnan(t) ? NAN : t;
    humidityOut = std::isnan(h) ? NAN : h;
}

} // namespace dht_sensor
