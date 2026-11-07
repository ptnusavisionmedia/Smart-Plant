#!/bin/sh
# Mosquitto's config file has no env-var expansion, so substitute our
# placeholders at container start before handing off to the real entrypoint.
set -eu

CONF_SRC=/mosquitto/config/mosquitto.conf.template
CONF_OUT=/mosquitto/config/mosquitto.conf

API_HTTP_HOST="${API_HTTP_HOST:-host.docker.internal}"
API_HTTP_PORT="${API_HTTP_PORT:-3001}"
INTERNAL_MQTT_SHARED_SECRET="${INTERNAL_MQTT_SHARED_SECRET:?INTERNAL_MQTT_SHARED_SECRET must be set}"

sed \
  -e "s#__API_HTTP_HOST__#${API_HTTP_HOST}#g" \
  -e "s#__API_HTTP_PORT__#${API_HTTP_PORT}#g" \
  -e "s#__INTERNAL_MQTT_SHARED_SECRET__#${INTERNAL_MQTT_SHARED_SECRET}#g" \
  "$CONF_SRC" > "$CONF_OUT"

exec /usr/sbin/mosquitto -c "$CONF_OUT"
