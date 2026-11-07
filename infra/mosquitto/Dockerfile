# Custom Mosquitto image with the mosquitto-go-auth plugin, so broker auth/ACL
# decisions are delegated to the API's /internal/mqtt/auth and /internal/mqtt/acl
# endpoints (same mechanism in local dev and production — see Tech Spec §1/§5).
FROM eclipse-mosquitto:2.0 AS base

FROM golang:1.23-alpine AS build-auth
ARG GO_AUTH_VERSION=v2.3.0
RUN apk add --no-cache git gcc musl-dev \
  && git clone --branch ${GO_AUTH_VERSION} --depth 1 https://github.com/iegomez/mosquitto-go-auth.git /src \
  && cd /src \
  && go build -buildmode=c-shared -o /out/go-auth.so ./

FROM base
COPY --from=build-auth /out/go-auth.so /mosquitto/go-auth.so
