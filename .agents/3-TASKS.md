# 3 — Implementation Tasks

**Sumber acuan:** `.agents/1-PRD.md`, `.agents/2-TECH-SPEC.md` v1.1, `.agents/DESIGN.md`.
**Tanggal dibuat:** 2026-11-07
**Scope default:** fitur inti dulu (alur klaim → monitoring → status → siram/emergency → notifikasi), lalu fitur sekunder. Task `Low` boleh ditunda tanpa memblokir pilot.
**Aturan eksekusi:** satu task selesai hanya jika lint + typecheck + test terkait lulus. Jangan menandai `Done` tanpa bukti.

## Ringkasan Modul

| Modul | Task | Fokus |
|---|---|---|
| 0 — Setup | T-01..T-04 | Monorepo, infra lokal, CI, observability |
| 1 — Shared | T-05..T-08 | Kontrak Zod, status engine, aturan penyiraman, default |
| 2 — Database | T-09..T-11 | Skema SQLite, migrasi, repository |
| 3 — API & Realtime | T-12..T-26 | Fastify, auth, device, MQTT, WebSocket, job |
| 4 — Firmware | T-27..T-32 | ESP32, sensor, pompa, kontrol lokal, MQTT |
| 5 — Web | T-33..T-41 | Next.js + Spectrum, dashboard, histori, E2E |
| 6 — Mobile | T-42..T-49 | Flutter + Spectrum, fitur inti, test |
| 7 — Rilis | T-50..T-55 | Integrasi, keamanan, beban, deploy, backup, docs |

**Critical path:** T-01 → T-05 → T-06 → T-09 → T-11 → T-12 → T-14 → T-23 → T-24 → T-31 → T-50 → T-53.

---

## Module 0 — Setup & Infrastructure

### T-01 — Scaffold monorepo
- **Modul:** Setup | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** —
- **Deskripsi:** Buat pnpm workspace + Turborepo sesuai Tech Spec §1: `apps/{web,api,mobile}`, `packages/{shared,db}`, `firmware/esp32`, `infra/`. Tambahkan `tsconfig.base.json`, ESLint, Prettier, `.editorconfig`, `.gitignore`, `.env.example`, dan script root (`dev`, `lint`, `typecheck`, `test`, `db:migrate`).
- **File:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.env.example`

### T-02 — Infra lokal (Mosquitto + Caddy)
- **Modul:** Setup | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-01
- **Deskripsi:** Siapkan Docker Compose lokal: Mosquitto port 1883 (tanpa TLS di lokal), konfigurasi persistensi, dan Caddyfile dasar untuk produksi. Tambahkan volume `infra/data`, `.gitkeep`, dan `infra/README.md` berisi perintah naik/turun.
- **File:** `infra/docker-compose.yml`, `infra/mosquitto/mosquitto.conf`, `infra/Caddyfile`, `infra/data/.gitkeep`, `infra/README.md`

### T-03 — CI lint/typecheck/test/build
- **Modul:** Setup | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-01
- **Deskripsi:** GitHub Actions: cache pnpm, jalankan `turbo lint typecheck test`, build API/web, `pio run` firmware, dan `flutter analyze && flutter test`. Pisahkan job agar kegagalan satu platform tidak menyembunyikan yang lain.
- **File:** `.github/workflows/ci.yml`

### T-04 — Config, logging, dan error tracking
- **Modul:** Setup | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-01
- **Deskripsi:** Validasi env dengan Zod (fail-fast), logger pino dengan `requestId`, dan init Sentry untuk API/web/Flutter. Pastikan secret tidak pernah dilog.
- **File:** `apps/api/src/config.ts`, `apps/api/src/plugins/logger.ts`, `apps/web/src/lib/sentry.ts`, `apps/mobile/lib/core/observability/sentry.dart`

---

## Module 1 — Shared Contracts & Business Rules

### T-05 — Skema Zod kontrak API & MQTT
- **Modul:** Shared | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-01
- **Deskripsi:** Definisikan skema: auth, device, claim, config/thresholds, telemetry, command, ack, notification, plant profile, respons error. Reject unknown fields, batas panjang string, dan tipe nullable untuk sensor gagal. Ekspor tipe TypeScript.
- **File:** `packages/shared/src/schemas/*.ts`, `packages/shared/src/index.ts`

### T-06 — Status engine
- **Modul:** Shared | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-05
- **Deskripsi:** Implement `evaluateStatus` persis Tech Spec §4.3: prioritas `CRITICAL > WATER_LOW > WARNING > NORMAL`, alasan `WATER_LOW` tetap disertakan saat CRITICAL, nilai `null` → `SENSOR_ERROR` (bukan NORMAL). Unit test semua boundary: soil 25/40/71/85, temp 15/18/31/35, humidity 40/50/71/80, water 15/30.
- **File:** `packages/shared/src/status-engine.ts`, `packages/shared/src/status-engine.test.ts`

### T-07 — Aturan penyiraman bersama
- **Modul:** Shared | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-05, T-06
- **Deskripsi:** Implement `canStartAutoWatering`, `shouldStopPump`, dan `validateManualWatering`: debounce 3 sampel, water level aman, emergency latch, cooldown, max 60 detik, target 55%, offline jika `last_seen > 3× interval`, dan auto OFF sampai config diterima. Unit test tiap penolakan.
- **File:** `packages/shared/src/watering-policy.ts`, `packages/shared/src/watering-policy.test.ts`

### T-08 — Default config & seed plant profile
- **Modul:** Shared | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 2j
- **Dependensi:** T-05
- **Deskripsi:** Tetapkan default: interval 30 detik, max pump 60 detik, cooldown 30 menit, target 55%, `water_source=ultrasonic`, auto OFF. Seed profil "Tanaman Hias Tropis", "Sukulen", "Sayuran Daun" dengan threshold wajar.
- **File:** `packages/shared/src/constants.ts`, `packages/db/src/seed.ts`

---

## Module 2 — Database

### T-09 — Skema Drizzle SQLite + client
- **Modul:** Database | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-01
- **Deskripsi:** Implement seluruh tabel Tech Spec §2 (`users`, `sessions`, `auth_tokens`, `plant_profiles`, `devices`, `device_configs`, `sensor_readings`, `status_events`, `watering_events`, `notifications`, `notification_preferences`, `push_tokens`, `audit_logs`, `readings_daily`) + index. Aktifkan PRAGMA WAL/synchronous/foreign_keys/busy_timeout/temp_store. ID UUIDv7, waktu epoch ms.
- **File:** `packages/db/src/schema/*.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`

### T-10 — Migrasi & seed
- **Modul:** Database | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-09, T-08
- **Deskripsi:** Konfigurasi drizzle-kit, migrasi awal idempotent, script `db:migrate` dan `db:seed`. Seed profil sistem; jangan seed data pengguna/perangkat.
- **File:** `packages/db/drizzle.config.ts`, `packages/db/migrations/`, `packages/db/src/seed.ts`

### T-11 — Repository layer
- **Modul:** Database | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-09
- **Deskripsi:** Bungkus akses DB per entitas; semua query perangkat wajib discope `user_id`. Sediakan query histori (raw/hour/day), latest reading, unread count, dan batch insert readings. Tidak boleh ada SQL tersebar di route.
- **File:** `packages/db/src/repositories/{users,devices,configs,readings,events,notifications,profiles,audit}.ts`

---

## Module 3 — API & Realtime

### T-12 — Fastify bootstrap & plugin
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-04, T-11
- **Deskripsi:** Bootstrap Fastify: plugin db, auth JWT, CORS allowlist, Helmet, rate limit in-memory, error handler seragam (`{code,message,details}`), requestId, dan validasi Zod. Daftarkan route di bawah `/api/v1`.
- **File:** `apps/api/src/server.ts`, `apps/api/src/app.ts`, `apps/api/src/plugins/*.ts`

### T-13 — Auth routes
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 8j
- **Dependensi:** T-12, T-05, T-11
- **Deskripsi:** Implement register/login/refresh/logout/forgot/reset/me. Argon2id (64 MB, 3 iterasi, paralel 4), access JWT 15 menit, refresh 30 hari dirotasi + hash, lockout 5x/15 menit, verifikasi email 24 jam, reset 30 menit. Mailer dev menulis link ke log. Test rotasi dan revoke.
- **File:** `apps/api/src/routes/auth.ts`, `apps/api/src/services/auth.service.ts`, `apps/api/src/services/mailer.ts`, `apps/api/src/routes/auth.test.ts`

### T-14 — Device routes & ownership
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-12, T-11
- **Deskripsi:** Implement list/claim/detail/patch/delete. Claim: hash kode, cari perangkat belum diklaim & belum kedaluwarsa, set `user_id`, buat config dari profil/default, kosongkan claim hash. Semua endpoint memfilter `user_id`; audit klaim/hapus.
- **File:** `apps/api/src/routes/devices.ts`, `apps/api/src/services/device.service.ts`, `apps/api/src/routes/devices.test.ts`

### T-15 — Config & plant profile routes
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-14
- **Deskripsi:** PATCH config dengan validasi lintas field (critical lebih ekstrem dari warning, target di atas warningLow), CRUD profil kustom, proteksi profil sistem, audit perubahan config.
- **File:** `apps/api/src/routes/config.ts`, `apps/api/src/routes/plant-profiles.ts`, `apps/api/src/services/config.service.ts`

### T-16 — History endpoints
- **Modul:** API | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-14, T-11
- **Deskripsi:** `GET readings` dengan `interval=raw|hour|day`: raw maks 24 jam, hour maks 90 hari, day maks 2 tahun (rollup). Downsample ≤120 titik. Sertakan status-events dan watering-events. Timezone simpan UTC.
- **File:** `apps/api/src/routes/readings.ts`, `apps/api/src/services/history.service.ts`

### T-17 — Notification routes & preferences
- **Modul:** API | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-12, T-11
- **Deskripsi:** List cursor pagination, read/read-all, unread count, preference in-app/push/telegram, register/revoke FCM token. Semua discope user.
- **File:** `apps/api/src/routes/notifications.ts`, `apps/api/src/routes/notification-preferences.ts`, `apps/api/src/routes/push-tokens.ts`

### T-18 — Internal MQTT auth & ACL
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-12, T-11
- **Deskripsi:** `POST /internal/mqtt/auth` dan `/acl`, hanya jaringan Docker + shared secret. Verifikasi hash secret device dan batasi topic ke `sp/{deviceId}/#`; service bridge punya akun terpisah. Test akses lintas device ditolak.
- **File:** `apps/api/src/routes/internal-mqtt.ts`, `apps/api/src/plugins/internal-auth.ts`

### T-19 — Latest state & event bus
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-11
- **Deskripsi:** `Map` latest state per device dengan hidrasi dari SQLite saat start; event bus in-process bertipe (`reading`, `status`, `presence`, `watering`, `notification`) untuk fan-out WebSocket dan service lain.
- **File:** `apps/api/src/realtime/latest-state.ts`, `apps/api/src/realtime/event-bus.ts`

### T-20 — WebSocket server
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-12, T-13, T-19
- **Deskripsi:** `GET /ws` dengan verifikasi JWT, room per user, heartbeat 30 detik, putus idle 90 detik, reconnect-safe. Backpressure: drop event `reading` bila klien lambat; jangan drop `status`/`notification`.
- **File:** `apps/api/src/plugins/websocket.ts`, `apps/api/src/realtime/ws-hub.ts`

### T-21 — Notification service (in-app, FCM, Telegram, retry)
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-17, T-19
- **Deskripsi:** Buat notifikasi saat status berubah; cooldown 15 menit per perangkat/tipe, tetapi CRITICAL/WATER_LOW selalu dikirim saat transisi. Simpan `sent_channels`/`delivery_attempts`, retry maks 3x backoff. Kegagalan satu kanal tidak memblokir kanal lain.
- **File:** `apps/api/src/services/notification.service.ts`, `apps/api/src/services/fcm.ts`, `apps/api/src/services/telegram.ts`

### T-22 — Telegram link & webhook
- **Modul:** API | **Prioritas:** Low | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-21, T-17
- **Deskripsi:** Kode tautan sekali pakai 10 menit, unlink, webhook dengan verifikasi secret header. Jangan log chat ID mentah.
- **File:** `apps/api/src/routes/integrations.ts`, `apps/api/src/services/telegram-link.service.ts`

### T-23 — Watering & emergency service
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-14, T-19, T-20
- **Deskripsi:** Manual watering: validasi ownership + kondisi, publish command QoS 1, tunggu ack 5 detik (timeout → `504 DEVICE_TIMEOUT`), tutup event `completed/stopped`. Auto: evaluasi & catat tanpa menggandakan aksi firmware. Emergency stop/reset + latch + audit. Tolak `WATER_LOW`, `EMERGENCY_STOP`, `DEVICE_OFFLINE`, `RATE_LIMITED`.
- **File:** `apps/api/src/services/watering.service.ts`, `apps/api/src/routes/watering.ts`, `apps/api/src/routes/emergency.ts`

### T-24 — MQTT bridge
- **Modul:** API | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 8j
- **Dependensi:** T-18, T-19, T-20, T-21, T-23
- **Deskripsi:** Subscribe `sp/+/telemetry|presence|ack|state`, validasi Zod, cocokkan `device_uid`, batch insert maks 100 baris/100 ms, update `last_seen`/online, debounce 3 sampel, evaluasi status, tulis status event, broadcast WS, kirim notifikasi. Tangani LWT offline dan payload historis.
- **File:** `apps/api/src/plugins/mqtt.ts`, `apps/api/src/services/telemetry.service.ts`, `apps/api/src/services/status.service.ts`

### T-25 — Scheduled jobs
- **Modul:** API | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-19, T-21, T-23, T-24
- **Deskripsi:** Offline detector tiap 30 detik (`last_seen > 3× interval`, notifikasi sekali per transisi), daily rollup 00:10 UTC, retention 01:00 UTC (raw 90 hari, rollup 2 tahun), notification retry. Idempotent; test dengan fake clock.
- **File:** `apps/api/src/jobs/{offline-detector,daily-rollup,retention,notification-retry}.ts`, `apps/api/src/jobs/scheduler.ts`

### T-26 — Health, readiness, shutdown
- **Modul:** API | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 2j
- **Dependensi:** T-12, T-24
- **Deskripsi:** `/health` dan `/ready` (DB + broker), graceful shutdown (tutup MQTT/WS/DB), metrik bridge (pesan masuk, gagal validasi, transisi status, latensi ack, ukuran DB).
- **File:** `apps/api/src/routes/health.ts`, `apps/api/src/metrics.ts`, `apps/api/src/server.ts`

---

## Module 4 — Firmware ESP32

### T-27 — Scaffold PlatformIO
- **Modul:** Firmware | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-01
- **Deskripsi:** Proyek `esp32dev` dengan dependency DHT, ArduinoJson, MQTT/TLS, NVS. Struktur `src/{sensors,control,network}`, `include/config.h`, dan build flags untuk lokal/produksi.
- **File:** `firmware/esp32/platformio.ini`, `firmware/esp32/src/main.cpp`, `firmware/esp32/include/config.h`

### T-28 — Sensor drivers
- **Modul:** Firmware | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-27
- **Deskripsi:** Soil ADC dengan kalibrasi kering/jenuh → persen; DHT22; HC-SR04 trigger 10 µs, timeout 30 ms, median 5 sampel, buang <2 cm/>400 cm, konversi level; float switch `INPUT_PULLUP` debounce 2 detik dan otoritatif untuk WATER LOW. Echo gagal 3x → `waterLevel=null`.
- **File:** `firmware/esp32/src/sensors/soil.cpp`, `dht.cpp`, `ultrasonic.cpp`, `float_switch.cpp`, `sensors.h`

### T-29 — Pompa, watchdog, interlock
- **Modul:** Firmware | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-27
- **Deskripsi:** Kontrol relay, batas `max_pump_seconds`, watchdog mematikan pompa pada `max+5` detik, tombol fisik memutus relay (hardware interlock) dan set latch di NVS. Jangan aktifkan pompa saat boot.
- **File:** `firmware/esp32/src/control/pump.cpp`, `firmware/esp32/src/control/emergency.cpp`

### T-30 — Local control engine
- **Modul:** Firmware | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-28, T-29
- **Deskripsi:** Aturan auto identik backend: auto mode aktif, tidak emergency, air aman, soil ≤ warningLow 3 sampel, cooldown, target 55%, max 60 detik. Simpan config di NVS dengan version; auto OFF sampai config valid diterima. Buffer 100 reading saat offline, kirim ulang dengan timestamp asli.
- **File:** `firmware/esp32/src/control/control_engine.cpp`, `firmware/esp32/src/control/config_store.cpp`, `firmware/esp32/src/control/offline_buffer.cpp`

### T-31 — MQTT client & provisioning
- **Modul:** Firmware | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-30, T-02
- **Deskripsi:** WiFi + MQTT TLS 8883, topik `sp/{deviceId}/telemetry|presence|command|ack|state`, LWT `offline`, QoS 1, command handler (`pump start`, `emergency_stop`, `emergency_reset`, config update), ack, dan alur klaim kode pairing.
- **File:** `firmware/esp32/src/network/wifi.cpp`, `mqtt.cpp`, `provisioning.cpp`

### T-32 — Firmware tests & bench checklist
- **Modul:** Firmware | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-28, T-29, T-30, T-31
- **Deskripsi:** Unit test Unity untuk parser sensor, aturan auto, dan buffer offline. Checklist bench: kalibrasi tanah, HC-SR04 di tangki nyata, float switch, emergency fisik, watchdog, reconnect, dan auto-off default.
- **File:** `firmware/esp32/test/`, `firmware/esp32/README.md`

---

## Module 5 — Web (Next.js + Spectrum)

### T-33 — Scaffold Next.js + design tokens
- **Modul:** Web | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-01
- **Deskripsi:** Next.js 15 App Router + Tailwind + shadcn/ui. Petakan token `DESIGN.md` ke CSS variables `--sp-*`, Tailwind theme, dan primitif shadcn (jangan pakai tema default). Bundle Source Sans 3 via `next/font/local`. Bangun shell: sidebar 240px, topbar 64px, responsif <1024px, light theme.
- **File:** `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`, `apps/web/src/components/ui/*`, `apps/web/src/components/layout/*`, `apps/web/src/app/layout.tsx`

### T-34 — API client, auth session, WS client
- **Modul:** Web | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-33, T-13
- **Deskripsi:** Fetch wrapper dengan access token di memori, refresh via cookie `httpOnly`, redirect saat 401, route protection, dan WS client dengan reconnect + status live/stale.
- **File:** `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/lib/ws.ts`, `apps/web/src/middleware.ts`

### T-35 — Auth pages
- **Modul:** Web | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-34
- **Deskripsi:** Login, register, forgot, reset. Validasi inline, error yang dapat ditindaklanjuti, show/hide password, status loading, dan pesan verifikasi email.
- **File:** `apps/web/src/app/(auth)/*/page.tsx`, `apps/web/src/components/auth/*`

### T-36 — Dashboard
- **Modul:** Web | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-34, T-20
- **Deskripsi:** Ringkasan semua perangkat: device card dengan moisture ring 72px, status badge (ikon + label), metrik 2×2, last seen, quick action Siram. State empty/loading/error/offline. Live/stale sesuai aturan 2× interval.
- **File:** `apps/web/src/app/page.tsx`, `apps/web/src/components/devices/DeviceCard.tsx`, `MoistureRing.tsx`, `StatusBadge.tsx`

### T-37 — Device detail & config
- **Modul:** Web | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 7j
- **Dependensi:** T-36, T-15, T-23
- **Deskripsi:** Detail real-time, moisture ring 120px, tank level indicator (jangan tampilkan 0% saat sensor gagal), tombol Siram + Hentikan pompa (emergency 56px, satu tap), form threshold per sensor dengan validasi lintas field, dan status auto mode.
- **File:** `apps/web/src/app/devices/[id]/page.tsx`, `apps/web/src/components/devices/*`, `apps/web/src/components/controls/*`

### T-38 — History
- **Modul:** Web | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-36, T-16
- **Deskripsi:** Grafik Recharts lazy-loaded (2px line, tanpa gradient), selector 24 jam/7 hari/30 hari, ringkasan teks, tabel alternatif, ekspor CSV, dan downsampling ≤120 titik.
- **File:** `apps/web/src/app/devices/[id]/history/page.tsx`, `apps/web/src/components/charts/*`

### T-39 — Notifications & settings
- **Modul:** Web | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-34, T-17, T-22
- **Deskripsi:** Daftar notifikasi (unread dengan label "Baru", bukan hanya warna), tandai dibaca, preferensi kanal, registrasi push token, dan tautkan/lepas Telegram.
- **File:** `apps/web/src/app/notifications/page.tsx`, `apps/web/src/app/settings/page.tsx`, `apps/web/src/components/notifications/*`

### T-40 — Plant profiles
- **Modul:** Web | **Prioritas:** Low | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-34, T-15
- **Deskripsi:** CRUD profil kustom, tampilkan profil sistem read-only, terapkan profil ke perangkat.
- **File:** `apps/web/src/app/profiles/page.tsx`, `apps/web/src/components/profiles/*`

### T-41 — A11y, responsive, E2E
- **Modul:** Web | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-35, T-36, T-37, T-38, T-39, T-40
- **Deskripsi:** Audit keyboard-only, focus-visible, 200% zoom, reduced motion, label Indonesia panjang, dan breakpoint 320/390/768/1024/1440. Playwright E2E: login → klaim → monitoring → siram → emergency stop.
- **File:** `apps/web/e2e/*.spec.ts`, `apps/web/src/**/*.tsx`

---

## Module 6 — Mobile (Flutter + Spectrum)

### T-42 — Scaffold Flutter + theme tokens
- **Modul:** Mobile | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-01
- **Deskripsi:** Flutter 3.24+, Riverpod, go_router, Dio, `flutter_secure_storage`, FCM, Sentry. Petakan token `DESIGN.md` ke `ThemeData` + `ThemeExtension<AppTokens>`. Bundle Source Sans 3 di `assets/fonts/`; tanpa `google_fonts`. Shell bottom nav 4 tab + safe area.
- **File:** `apps/mobile/pubspec.yaml`, `apps/mobile/lib/app/theme/*`, `apps/mobile/lib/main.dart`, `apps/mobile/assets/fonts/*`

### T-43 — Auth flow
- **Modul:** Mobile | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-42, T-13
- **Deskripsi:** Login/register/forgot/reset, token di secure storage, refresh interceptor + retry sekali, route guard, dan logout yang mencabut sesi.
- **File:** `apps/mobile/lib/features/auth/*`, `apps/mobile/lib/core/api/*`, `apps/mobile/lib/app/router.dart`

### T-44 — Device list & detail
- **Modul:** Mobile | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 7j
- **Dependensi:** T-43, T-20
- **Deskripsi:** Daftar perangkat + status, detail real-time via WS, moisture ring 72/120dp dengan semantics, tank indicator, badge status, live/stale, dan state offline/error.
- **File:** `apps/mobile/lib/features/devices/*`, `apps/mobile/lib/features/monitoring/*`, `apps/mobile/lib/shared/widgets/*`

### T-45 — Watering & emergency controls
- **Modul:** Mobile | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-44, T-23
- **Deskripsi:** Siram dengan pilihan durasi (default 10, maks 60 detik), emergency stop satu tap di area aman (bukan gesture zone), konfirmasi hanya jika benar-benar diperlukan, dan form config threshold.
- **File:** `apps/mobile/lib/features/watering/*`, `apps/mobile/lib/features/settings/config/*`

### T-46 — History
- **Modul:** Mobile | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-44, T-16
- **Deskripsi:** Grafik ringkas dengan downsampling, selector rentang, ringkasan teks, dan state kosong/error.
- **File:** `apps/mobile/lib/features/monitoring/history/*`

### T-47 — Notifications & push
- **Modul:** Mobile | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-43, T-17, T-22
- **Deskripsi:** Daftar notifikasi, tandai dibaca, preferensi, registrasi FCM token, handling foreground/background, dan deep link ke perangkat.
- **File:** `apps/mobile/lib/features/notifications/*`, `apps/mobile/lib/core/notifications/*`

### T-48 — Settings & plant profiles
- **Modul:** Mobile | **Prioritas:** Low | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-43, T-15
- **Deskripsi:** Profil akun, preferensi, daftar/terapkan profil tanaman, logout, dan halaman offline/error.
- **File:** `apps/mobile/lib/features/settings/*`

### T-49 — Widget/integration tests & accessibility
- **Modul:** Mobile | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-44, T-45, T-46, T-47, T-48
- **Deskripsi:** Widget test status card, login, kontrol pompa; integration test alur utama; uji text scale terbesar, semantics moisture ring, dan safe area.
- **File:** `apps/mobile/test/`, `apps/mobile/integration_test/`

---

## Module 7 — Integrasi & Rilis

### T-50 — Full-stack integration test
- **Modul:** Rilis | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 8j
- **Dependensi:** T-24, T-25, T-32, T-41, T-49
- **Deskripsi:** Simulator perangkat (publish telemetry/ack/LWT) → API → SQLite → WebSocket → web/mobile. Verifikasi status transition, notifikasi, manual watering ack/timeout, emergency stop, reconnect buffer, dan rollup/retention.
- **File:** `tools/device-simulator/`, `apps/api/test/integration/*`, `apps/web/e2e/*`

### T-51 — Security hardening
- **Modul:** Rilis | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-50
- **Deskripsi:** Review ownership/BOLA di semua endpoint, rate limit, cookie `httpOnly/Secure/SameSite`, CSP/Helmet, MQTT ACL lintas device, internal shared secret, secret tidak di repo/log, audit log, dan `pnpm audit`/dependency scan.
- **File:** `apps/api/src/**`, `apps/web/src/**`, `infra/**`, `.github/workflows/security.yml`

### T-52 — Performance & load test
- **Modul:** Rilis | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 5j
- **Dependensi:** T-50
- **Deskripsi:** Uji 100 perangkat, ingest 200 pesan/detik, p95 API <500 ms, fan-out WS, ukuran DB 90 hari, dan perilaku backpressure. Catat batas sebelum migrasi PostgreSQL.
- **File:** `tools/loadtest/*`, `docs/performance.md`

### T-53 — Deployment produksi
- **Modul:** Rilis | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 6j
- **Dependensi:** T-03, T-26, T-50
- **Deskripsi:** VPS Docker Compose (caddy, api, mosquitto, volume data), TLS `api/ws/mqtt`, env produksi, migrasi dengan backup otomatis, firewall 80/443/8883/22, deploy web Vercel, dan smoke test `/health`/`/ready`.
- **File:** `infra/docker-compose.prod.yml`, `infra/Caddyfile`, `.github/workflows/deploy.yml`

### T-54 — Backup & restore drill
- **Modul:** Rilis | **Prioritas:** High | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 3j
- **Dependensi:** T-53
- **Deskripsi:** Cron `sqlite3 .backup` harian, retensi 14 hari, salin terenkripsi ke object storage, backup sebelum migrasi, dan dokumentasi restore yang sudah diuji.
- **File:** `infra/scripts/backup.sh`, `infra/scripts/restore.sh`, `infra/README.md`

### T-55 — Dokumentasi & checklist rilis
- **Modul:** Rilis | **Prioritas:** Mid | **Status:** Todo | **Tanggal:** 2026-11-07 | **Estimasi:** 4j
- **Dependensi:** T-51, T-52, T-53, T-54
- **Deskripsi:** README root, panduan provisioning perangkat, runbook operasional (restart, migrasi, restore, rotasi secret), checklist rilis web/mobile, dan metadata Play/App Store.
- **File:** `README.md`, `docs/runbook.md`, `docs/provisioning.md`, `docs/release-checklist.md`

---

## Status Ringkas

- **Todo:** 55
- **In Progress:** 0
- **Done:** 0
- **Blocker:** —
