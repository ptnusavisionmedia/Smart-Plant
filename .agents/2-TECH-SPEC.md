# Tech Spec — Smart Plant Emergency Detector

**Versi:** 1.1
**Acuan:** `.agents/1-PRD.md` v1.1
**Platform:** Website dashboard, aplikasi mobile Flutter (Android/iOS), firmware ESP32, backend IoT

> **Perubahan v1.1:** mobile memakai **Flutter**, database V1 memakai **SQLite**, message broker memakai **MQTT (Mosquitto)**. Tech Spec ini tetap menyiapkan jalur migrasi ke PostgreSQL/TimescaleDB + Redis saat skala bertambah.

---

## 1. Tech Stack & Arsitektur

### Tech Stack

| Layer | Technology | Version | Alasan |
|---|---|---|---|
| Web | Next.js (App Router) | 15.x | SSR dashboard, routing, DX, deploy mudah |
| Web UI | React + Tailwind CSS + shadcn/ui | 19 / 4.x | Komponen aksesibel, styling cepat |
| Web Data | TanStack Query + WebSocket | 5.x | Cache server-state + update real-time |
| Web Charts | Recharts | 2.x | Grafik tren sensor |
| Mobile | Flutter | 3.24+ | Satu basis kode Android/iOS, performa native |
| Mobile Language | Dart | 3.5+ | Bahasa resmi Flutter |
| Mobile State | Riverpod | 2.x | State management teruji, testable |
| Mobile Routing | go_router | 14.x | Deklaratif, mendukung deep link |
| Mobile HTTP | Dio | 5.x | Interceptor token & retry |
| Mobile WS | web_socket_channel | 3.x | Koneksi WebSocket real-time |
| Mobile Storage | flutter_secure_storage | 9.x | Simpan token dengan aman |
| Mobile Charts | fl_chart | 0.69+ | Grafik ringan untuk mobile |
| Mobile Push | firebase_messaging + flutter_local_notifications | - | FCM (Android) + APNs via FCM (iOS) |
| Mobile Build | Flutter build + GitHub Actions | - | Build APK/AAB & IPA; Fastlane opsional |
| Backend | Node.js + Fastify | 22 LTS / 5.x | Throughput tinggi, WebSocket, MQTT bridge |
| Bahasa Backend | TypeScript | 5.x | Type safety end-to-end |
| Validasi | Zod | 3.x | Skema request/MQTT/response |
| Auth | JWT access + refresh, Argon2id | - | Stateless access, refresh dapat dicabut |
| Database | SQLite 3 (better-sqlite3) | 3.4x | Zero-ops, satu file, cukup untuk pilot V1 |
| ORM | Drizzle ORM + drizzle-kit (SQLite) | 0.3x | SQL-first, migrasi ringan |
| Cache/PubSub | In-process (Map + EventEmitter) | - | Single instance V1; tanpa Redis |
| MQTT Broker | Eclipse Mosquitto + mosquitto-go-auth | 2.x | Ringan, TLS, auth per device |
| Firmware | ESP32 + Arduino framework (PlatformIO) | - | Ekosistem sensor lengkap |
| Telegram | Telegram Bot API | - | Peringatan eksternal |
| Push Backend | Firebase Admin SDK (FCM) | - | Kirim push ke Android/iOS |
| Hosting API | DigitalOcean VPS + Docker Compose | - | Broker MQTT butuh koneksi publik persisten |
| Hosting Web | Vercel | - | Deploy Next.js otomatis |
| Reverse Proxy | Caddy | 2.x | TLS otomatis untuk API, WS, MQTT |
| Monitoring | Sentry + pino + uptime check | - | Error tracking & log terstruktur |

### Arsitektur Sistem

```text
┌────────────┐   MQTT/TLS 8883   ┌──────────────┐
│ ESP32      │ ────────────────► │ Mosquitto    │
│ (perangkat)│ ◄──────────────── │ + auth/ACL   │
└────────────┘   command/config  └──────┬───────┘
                                        │ MQTT (internal)
                                        ▼
┌────────────┐   HTTPS/WSS   ┌────────────────────┐
│ Web        │ ────────────► │ Fastify API        │
│ (Next.js)  │               │ - REST             │
└────────────┘               │ - WebSocket        │
┌────────────┐               │ - MQTT bridge      │
│ Mobile     │ ────────────► │ - Status engine    │
│ (Flutter)  │               │ - Notification svc │
└────────────┘               └─────┬──────┬───────┘
                                   │      │
                        ┌──────────▼─┐  ┌─▼─────────────────┐
                        │ SQLite     │  │ In-memory cache    │
                        │ file (WAL) │  │ latest + pub/sub   │
                        └────────────┘  └────────────────────┘
                                   │
                    ┌──────────────┼───────────────┐
                    ▼              ▼               ▼
              FCM Push       Telegram Bot     (future: email)
```

**Prinsip arsitektur:**
- Perangkat **tidak bergantung pada cloud** untuk penyiraman otomatis; logika lokal tetap berjalan saat internet putus.
- Backend menjadi **otoritas status** dan sumber data histori.
- Web dan mobile memakai **API yang sama**; WebSocket untuk update real-time.
- MQTT dipakai hanya untuk komunikasi perangkat; klien web/mobile tidak terhubung langsung ke broker.
- **V1 single instance:** SQLite + cache in-memory. Jangan menjalankan lebih dari satu instance API terhadap file SQLite yang sama.

### Struktur Folder (monorepo)

```text
smart-plant/
├─ apps/
│  ├─ web/                      # Next.js 15
│  │  ├─ src/app/
│  │  │  ├─ (auth)/login/
│  │  │  ├─ (auth)/register/
│  │  │  ├─ devices/[id]/
│  │  │  ├─ notifications/
│  │  │  └─ settings/
│  │  ├─ src/components/
│  │  ├─ src/lib/api.ts
│  │  └─ src/lib/ws.ts
│  ├─ mobile/                   # Flutter
│  │  ├─ lib/
│  │  │  ├─ main.dart
│  │  │  ├─ app/
│  │  │  │  ├─ router.dart
│  │  │  │  └─ theme/           # ThemeData + ThemeExtension token
│  │  │  ├─ core/
│  │  │  │  ├─ api/
│  │  │  │  ├─ ws/
│  │  │  │  ├─ storage/
│  │  │  │  └─ notifications/
│  │  │  ├─ features/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ devices/
│  │  │  │  ├─ monitoring/
│  │  │  │  ├─ watering/
│  │  │  │  ├─ notifications/
│  │  │  │  └─ settings/
│  │  │  └─ shared/
│  │  │     ├─ widgets/
│  │  │     └─ models/
│  │  ├─ assets/fonts/
│  │  ├─ test/
│  │  └─ pubspec.yaml
│  └─ api/                      # Fastify
│     ├─ src/
│     │  ├─ routes/
│     │  │  ├─ auth.ts
│     │  │  ├─ devices.ts
│     │  │  ├─ notifications.ts
│     │  │  ├─ integrations.ts
│     │  │  └─ internal-mqtt.ts
│     │  ├─ plugins/
│     │  │  ├─ auth.ts
│     │  │  ├─ db.ts
│     │  │  ├─ websocket.ts
│     │  │  └─ mqtt.ts
│     │  ├─ services/
│     │  │  ├─ telemetry.service.ts
│     │  │  ├─ status.service.ts
│     │  │  ├─ watering.service.ts
│     │  │  ├─ notification.service.ts
│     │  │  └─ device.service.ts
│     │  ├─ realtime/
│     │  │  ├─ latest-state.ts
│     │  │  └─ event-bus.ts
│     │  ├─ jobs/
│     │  │  ├─ offline-detector.ts
│     │  │  ├─ daily-rollup.ts
│     │  │  ├─ retention.ts
│     │  │  └─ notification-retry.ts
│     │  └─ server.ts
├─ packages/
│  ├─ shared/                   # Zod schema, tipe, status engine
│  │  ├─ src/schemas/
│  │  ├─ src/status-engine.ts
│  │  └─ src/constants.ts
│  └─ db/                       # Drizzle SQLite schema + migrations
│     ├─ src/schema/
│     └─ migrations/
├─ firmware/
│  └─ esp32/
│     ├─ src/main.cpp
│     ├─ src/sensors/
│     ├─ src/control/
│     ├─ src/network/
│     ├─ include/config.h
│     └─ platformio.ini
├─ infra/
│  ├─ docker-compose.yml
│  ├─ Caddyfile
│  ├─ mosquitto/
│  └─ data/                     # volume SQLite (gitignored)
├─ .agents/
├─ pnpm-workspace.yaml
└─ turbo.json
```

### Justifikasi

- **Monorepo pnpm + Turborepo:** berbagi skema Zod, tipe, dan status engine antara API dan web. Flutter memakai model Dart yang di-generate/diselaraskan dari kontrak API (lihat catatan di bagian 3).
- **Fastify + MQTT bridge:** satu proses menangani ingest perangkat, evaluasi status, REST, dan fan-out WebSocket; mengurangi jumlah service untuk V1.
- **SQLite:** menghilangkan kebutuhan server database, cocok untuk pilot dan pengembangan lokal. Trade-off: single writer/single instance dan kapasitas terbatas; jalur migrasi ke PostgreSQL disiapkan sejak awal.
- **In-process cache/pub-sub:** dengan satu instance API, Redis belum memberi nilai tambah. Diganti Redis saat API di-scale horizontal.
- **Mosquitto:** broker ringan, cukup untuk V1; dapat diganti EMQX saat skala besar.
- **Flutter:** satu basis kode Android/iOS dengan performa native dan kontrol penuh atas UI, sesuai permintaan.

---

## 2. Database Design

### Ringkasan Database

| Item | Detail |
|---|---|
| Database | SQLite 3 (file `data/smartplant.db`) |
| Driver | `better-sqlite3` (synchronous, cepat untuk single process) |
| ORM | Drizzle ORM (SQLite dialect) + drizzle-kit |
| Pendekatan | Relasional; time-series disimpan sebagai tabel dengan PK komposit |
| Migrasi | drizzle-kit; SQL manual untuk PRAGMA/index/trigger |
| Mode | WAL, `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON` |
| Backup | `sqlite3 .backup` harian + salinan file sebelum migrasi |

### Batasan V1 (SQLite)

- **Satu instance API** — SQLite hanya mendukung satu writer; jangan scale horizontal.
- Kapasitas pilot yang disarankan: **≤ 100 perangkat**, interval telemetry **≥ 30 detik**, retensi mentah **90 hari**. Perkiraan: 100 perangkat × 2/menit × 86.400 = 288.000 baris/hari (~26 juta baris/90 hari). Di atas itu, migrasikan ke PostgreSQL/TimescaleDB.
- Query analitik berat (agregasi jangka panjang) memakai tabel rollup, bukan agregasi seluruh data mentah.
- File DB berada di volume persisten VPS; backup wajib sebelum migrasi dan secara harian.
- Enkripsi at-rest bergantung pada disk VPS; SQLCipher tidak dipakai di V1.

### PRAGMA Wajib

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
```

### Entity Overview

| Entity | Key Fields | Relasi |
|---|---|---|
| `users` | id, name, email (unique), password_hash, email_verified_at | → devices (1:N), → sessions, → notifications |
| `sessions` | id, user_id, refresh_token_hash, expires_at, revoked_at | ← users |
| `auth_tokens` | id, user_id, type (`email_verify`/`password_reset`), token_hash, expires_at, used_at | ← users |
| `plant_profiles` | id, name, is_system, owner_user_id, thresholds (JSON text) | ← users (opsional), → devices |
| `devices` | id, user_id, name, location, device_uid (unique), claim_code_hash, mqtt_secret_hash, plant_profile_id, firmware_version, last_seen_at, is_online, auto_mode, emergency_latched | ← users, → device_configs (1:1), → sensor_readings |
| `device_configs` | device_id (PK), thresholds (JSON text), target_moisture, max_pump_seconds, cooldown_seconds, telemetry_interval_seconds, water_level_source, tank_height_cm, tank_max_level_cm, config_version | ← devices |
| `sensor_readings` | device_id, time (epoch ms), soil_moisture, temperature, humidity, water_level, water_level_cm, water_level_source, pump_on, status, raw (JSON text) | ← devices |
| `status_events` | id, device_id, status, reasons (JSON text), created_at | ← devices |
| `watering_events` | id, device_id, trigger (`auto`/`manual`/`emergency`), started_at, ended_at, duration_seconds, status | ← devices |
| `notifications` | id, user_id, device_id, type, title, body, reasons (JSON text), sent_channels, delivery_attempts, last_error, read_at, created_at | ← users, ← devices |
| `notification_preferences` | user_id (PK), in_app, push, telegram, telegram_chat_id | ← users |
| `push_tokens` | id, user_id, fcm_token, platform, revoked_at | ← users |
| `audit_logs` | id, user_id, device_id, action, metadata (JSON text), created_at | ← users, ← devices |
| `readings_daily` (rollup) | device_id, day (YYYY-MM-DD UTC), soil_avg, soil_min, soil_max, temp_avg, humidity_avg, water_avg | ← devices |

**Konvensi tipe SQLite:**
- ID: `TEXT` berisi UUID v7 (dibuat aplikasi).
- Waktu: `INTEGER` epoch milidetik UTC.
- Boolean: `INTEGER` 0/1.
- JSON: `TEXT` (gunakan `json_extract` bila perlu; validasi di aplikasi).
- Nilai sensor: `REAL` (nullable jika sensor gagal).

### Detail Penting

**`devices`**
- `user_id` nullable → perangkat belum diklaim.
- `claim_code_hash` → kode pairing sekali pakai; plaintext tidak disimpan.
- `mqtt_secret_hash` → diverifikasi oleh endpoint auth broker; tidak pernah dikirim ke klien.
- Unik: `device_uid`, `mqtt_username` (= `device_uid`).

**`device_configs.thresholds` (JSON)**
```json
{
  "soil":     { "criticalLow": 25, "warningLow": 40, "warningHigh": 71, "criticalHigh": 85 },
  "temp":     { "criticalLow": 15, "warningLow": 18, "warningHigh": 31, "criticalHigh": 35 },
  "humidity": { "criticalLow": 40, "warningLow": 50, "warningHigh": 71, "criticalHigh": 80 },
  "water":    { "warningLow": 30, "criticalLow": 15 }
}
```

**`sensor_readings`**
- Primary key `(device_id, time)` dengan `WITHOUT ROWID`.
- `water_level_source` = `ultrasonic` | `float_switch`.
- `status` menyimpan status hasil evaluasi saat pembacaan masuk.
- Retensi mentah **90 hari**; rollup harian **2 tahun**.

**`watering_events`**
- `status` = `running` | `completed` | `stopped` | `rejected` | `timeout`.
- `ended_at` diisi saat pompa berhenti; `duration_seconds` dihitung.

### Skema Inti (SQL)

```sql
CREATE TABLE sensor_readings (
  device_id TEXT NOT NULL,
  time INTEGER NOT NULL,
  soil_moisture REAL,
  temperature REAL,
  humidity REAL,
  water_level REAL,
  water_level_cm REAL,
  water_level_source TEXT NOT NULL DEFAULT 'ultrasonic',
  pump_on INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  raw TEXT,
  PRIMARY KEY (device_id, time)
) WITHOUT ROWID;

CREATE INDEX idx_readings_time ON sensor_readings(time);

CREATE TABLE readings_daily (
  device_id TEXT NOT NULL,
  day TEXT NOT NULL,              -- YYYY-MM-DD (UTC)
  soil_avg REAL, soil_min REAL, soil_max REAL,
  temp_avg REAL, humidity_avg REAL, water_avg REAL,
  PRIMARY KEY (device_id, day)
) WITHOUT ROWID;
```

### Index Strategy

- `sensor_readings` PK `(device_id, time)` — query histori per perangkat (scan mundur untuk urutan terbaru).
- `sensor_readings(time)` — job retensi dan agregasi lintas perangkat.
- `status_events (device_id, created_at DESC)` — timeline status.
- `watering_events (device_id, started_at DESC)` — riwayat penyiraman.
- `notifications (user_id, created_at DESC)` — daftar notifikasi.
- Partial index `notifications (user_id) WHERE read_at IS NULL` — badge unread.
- `devices (user_id)` — daftar perangkat pengguna.
- `sessions (user_id)` + unique `refresh_token_hash`.
- Unique `devices (device_uid)`.

### Agregasi & Retensi (pengganti Timescale)

Tidak ada continuous aggregate. Gunakan:

1. **Hourly on-demand** untuk grafik ≤ 90 hari:
```sql
SELECT (time / 3600000) * 3600000 AS bucket,
       avg(soil_moisture) AS soil,
       avg(temperature)   AS temp,
       avg(humidity)      AS humidity,
       avg(water_level)   AS water
FROM sensor_readings
WHERE device_id = ? AND time BETWEEN ? AND ?
GROUP BY bucket
ORDER BY bucket;
```

2. **`readings_daily` rollup** untuk rentang > 90 hari:
- Job `daily-rollup` berjalan 00:10 UTC, mengisi hari sebelumnya dari data mentah.
- Job `retention` berjalan 01:00 UTC:
  - hapus `sensor_readings` > 90 hari;
  - hapus `readings_daily` > 2 tahun.

3. **Raw query** untuk ≤ 24 jam; batasi jumlah titik (downsample di aplikasi bila perlu).

### Data Flow

```text
User klaim perangkat
  → devices.user_id terisi
  → device_configs dibuat dari plant_profile/default

ESP32 publish telemetry
  → API validasi payload (Zod)
  → insert sensor_readings (batch)
  → update in-memory latest + evaluasi status
  → jika status berubah: insert status_events + notifications
  → kirim FCM/Telegram + broadcast WebSocket

User menekan siram
  → API validasi ownership + kondisi aman
  → publish command ke MQTT
  → device menjalankan + publish ack
  → API update watering_events + latest state + WebSocket
```

### Jalur Migrasi ke PostgreSQL/TimescaleDB

Siapkan sejak V1:
- Semua akses DB lewat repository/service, bukan SQL tersebar di route.
- Gunakan tipe yang portabel (UUID text, timestamp integer/`timestamptz`, JSON text/`jsonb`).
- Saat pindah: buat skema PostgreSQL, migrasikan data via skrip ekspor-impor, ganti driver Drizzle, tambahkan hypertable + continuous aggregate, lalu aktifkan multi-instance + Redis.

---

## 3. Interface Design

### REST API

Semua endpoint berprefix `/api/v1`. Autentikasi memakai `Authorization: Bearer <access_token>` kecuali ditandai publik.

#### Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Registrasi akun | No |
| POST | `/auth/login` | Login, terbitkan access + refresh token | No |
| POST | `/auth/refresh` | Rotasi refresh token | No (refresh token) |
| POST | `/auth/logout` | Cabut sesi | Yes |
| POST | `/auth/forgot-password` | Kirim email reset | No |
| POST | `/auth/reset-password` | Set password baru via token | No |
| GET | `/auth/me` | Profil pengguna saat ini | Yes |

#### Devices

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/devices` | Daftar perangkat + status ringkas | Yes |
| POST | `/devices/claim` | Klaim perangkat dengan claim code | Yes |
| GET | `/devices/:id` | Detail perangkat + config | Yes |
| PATCH | `/devices/:id` | Ubah nama/lokasi/profil tanaman | Yes |
| DELETE | `/devices/:id` | Hapus ikatan perangkat | Yes |
| PATCH | `/devices/:id/config` | Ubah threshold & pengaturan penyiraman | Yes |
| POST | `/devices/:id/watering` | Perintah siram manual | Yes |
| POST | `/devices/:id/emergency-stop` | Hentikan pompa & kunci mode otomatis | Yes |
| POST | `/devices/:id/emergency-reset` | Reset emergency latch | Yes |
| GET | `/devices/:id/readings` | Histori sensor (`from`, `to`, `interval`) | Yes |
| GET | `/devices/:id/status-events` | Timeline status | Yes |
| GET | `/devices/:id/watering-events` | Riwayat penyiraman | Yes |

#### Notifications & Integrations

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/notifications` | Daftar notifikasi (cursor pagination) | Yes |
| PATCH | `/notifications/:id/read` | Tandai dibaca | Yes |
| PATCH | `/notifications/read-all` | Tandai semua dibaca | Yes |
| GET | `/notification-preferences` | Preferensi kanal | Yes |
| PATCH | `/notification-preferences` | Ubah preferensi | Yes |
| POST | `/push-tokens` | Daftarkan FCM token | Yes |
| DELETE | `/push-tokens/:token` | Cabut FCM token | Yes |
| POST | `/integrations/telegram/link` | Buat kode tautan Telegram | Yes |
| DELETE | `/integrations/telegram/link` | Lepaskan tautan Telegram | Yes |
| POST | `/integrations/telegram/webhook` | Webhook bot Telegram | No (secret header) |

#### Plant Profiles

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/plant-profiles` | Profil sistem + milik pengguna | Yes |
| POST | `/plant-profiles` | Buat profil kustom | Yes |
| PATCH | `/plant-profiles/:id` | Ubah profil milik pengguna | Yes |
| DELETE | `/plant-profiles/:id` | Hapus profil milik pengguna | Yes |

#### Internal (hanya jaringan internal broker ↔ API)

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/internal/mqtt/auth` | Verifikasi kredensial device | Shared secret |
| POST | `/internal/mqtt/acl` | Cek izin topic device | Shared secret |
| GET | `/health` | Health check | No |
| GET | `/ready` | Readiness (DB/broker) | No |

### Contoh Kontrak Penting

**POST `/devices/claim`**
```json
{ "claimCode": "SP-7F3K-92QD", "name": "Monstera Ruang Tamu", "location": "Ruang Tamu" }
```
```json
{
  "id": "0192f...",
  "deviceUid": "esp32-a1b2c3",
  "name": "Monstera Ruang Tamu",
  "status": "NORMAL",
  "isOnline": true
}
```

**POST `/devices/:id/watering`**
```json
{ "durationSeconds": 10 }
```
```json
{ "commandId": "cmd_01J...", "accepted": true, "state": "pending" }
```
Error yang mungkin: `409 WATER_LOW`, `409 EMERGENCY_STOP`, `409 DEVICE_OFFLINE`, `429 RATE_LIMITED`.

**GET `/devices/:id/readings?from=...&to=...&interval=hour`**
```json
{
  "interval": "hour",
  "points": [
    { "bucket": "2026-11-07T10:00:00Z", "soilMoisture": 43.2, "temperature": 27.1, "humidity": 64.8, "waterLevel": 76.0 }
  ]
}
```
`interval` = `raw` (default, maks 24 jam), `hour` (maks 90 hari), `day` (maks 2 tahun, dari `readings_daily`).

### WebSocket

- Endpoint: `GET /ws` (upgrade), token access dikirim via query `?token=` atau subprotocol header.
- Server memverifikasi JWT, lalu otomatis subscribe ke room seluruh perangkat milik pengguna.
- Fan-out memakai `EventEmitter` in-process (single instance V1).
- Heartbeat ping/pong 30 detik; koneksi idle 90 detik ditutup.

Event server → klien:
```json
{ "type": "reading", "deviceId": "...", "data": { "soilMoisture": 43.2, "temperature": 27.1, "humidity": 64.8, "waterLevel": 76.0, "pumpOn": false, "ts": "..." } }
{ "type": "status", "deviceId": "...", "status": "WARNING", "reasons": ["SOIL_WARNING_DRY"], "ts": "..." }
{ "type": "device_presence", "deviceId": "...", "online": false, "lastSeenAt": "..." }
{ "type": "watering", "deviceId": "...", "state": "running", "trigger": "manual", "endsAt": "..." }
{ "type": "notification", "notification": { "id": "...", "title": "...", "readAt": null } }
```

### Halaman Web

| Route | Isi |
|---|---|
| `/login`, `/register` | Autentikasi |
| `/forgot-password`, `/reset-password` | Pemulihan akun |
| `/` | Ringkasan semua perangkat + status + alert terbaru |
| `/devices/[id]` | Monitoring real-time, kontrol pompa, emergency stop, config |
| `/devices/[id]/history` | Grafik + tabel histori + ekspor CSV |
| `/notifications` | Daftar peringatan |
| `/settings` | Profil, preferensi notifikasi, Telegram, push token |
| `/profiles` | Profil tanaman & threshold |

### Layar Mobile (Flutter)

| Route (go_router) | Isi |
|---|---|
| `/login`, `/register` | Autentikasi |
| `/forgot-password` | Reset password |
| `/` | Daftar perangkat + status + alert |
| `/devices/:id` | Detail real-time + siram + emergency stop |
| `/devices/:id/history` | Grafik ringkas |
| `/notifications` | Peringatan |
| `/settings` | Profil, preferensi, Telegram, logout |

**Catatan model Dart:** skema Zod di `packages/shared` adalah sumber kebenaran kontrak. Model Dart dibuat manual atau di-generate (mis. `json_serializable`) dan harus diuji terhadap contoh payload yang sama.

### UI Implementation

Sumber kebenaran visual: **`.agents/DESIGN.md`** (Adobe Spectrum 2, snapshot `@adobe/spectrum-tokens` v15.6.0). Tech Spec ini tidak menduplikasi nilai token.

| Area | Implementasi |
|---|---|
| Web | CSS variables `--sp-*` di `apps/web/src/app/globals.css`; dipetakan ke Tailwind theme dan primitif shadcn/ui. Jangan memakai tema default shadcn. |
| Flutter | Token dipetakan ke `ThemeData` + `ThemeExtension<AppTokens>` di `apps/mobile/lib/app/theme/`; warna mentah tidak boleh tersebar di widget. |
| Font | Bundle **Source Sans 3** (dan Source Code Pro) lokal: web via `next/font/local`, Flutter di `apps/mobile/assets/fonts/`. Tanpa download runtime (`google_fonts`). |
| Status | Setiap status wajib ikon + label teks; `WATER LOW` memakai informative blue, bukan merah; offline bukan merah. |
| Tema | V1 hanya light theme. Token semantik disiapkan agar dark theme dapat ditambahkan tanpa rename. |

---

## 4. Alur Logika & Business Rules

### 4.1 Registrasi & Login

**Registrasi:**
1. Klien kirim nama, email, password.
2. API validasi dengan Zod; cek email unik.
3. Hash password (Argon2id); buat `users` + `auth_tokens` (`email_verify`, hash token, expiry 24 jam).
4. Kirim email verifikasi (dev: link ditulis ke log).
5. Pengguna verifikasi → `email_verified_at` terisi.
6. Login menghasilkan access token (15 menit) + refresh token (30 hari, disimpan hash di `sessions`).

**Login:**
1. Verifikasi email + password (Argon2id).
2. Gagal 5x berturut-turut → kunci 15 menit (counter in-memory per email+IP).
3. Terbitkan token; web menyimpan refresh token di cookie `httpOnly`, Flutter di `flutter_secure_storage`.
4. Refresh token dirotasi setiap refresh; token lama dicabut.

### 4.2 Klaim Perangkat

1. Pengguna memasukkan claim code dari label perangkat.
2. API hash claim code, cari `devices` dengan `claim_code_hash` cocok, `user_id IS NULL`, belum kedaluwarsa.
3. Set `user_id`, buat `device_configs` dari profil default (atau profil yang dipilih).
4. Kosongkan `claim_code_hash` (sekali pakai).
5. Perangkat sudah terhubung MQTT dengan kredensialnya; API mulai menerima telemetry.
6. Jika perangkat belum pernah online, tampilkan status "menunggu koneksi".

### 4.3 Ingest Telemetry & Evaluasi Status

1. ESP32 publish ke `sp/{deviceId}/telemetry` (QoS 1, TLS).
2. Broker memverifikasi kredensial via `/internal/mqtt/auth`; ACL memastikan device hanya menulis topic miliknya.
3. API bridge menerima pesan, validasi skema Zod, cek `device_uid` cocok.
4. Insert `sensor_readings` (batch); update in-memory latest; update `devices.last_seen_at`, `is_online=1`.
5. Ambil 3 pembacaan terakhir (termasuk yang baru) untuk debounce.
6. Jalankan `evaluateStatus(readings[0..2], config)`.
7. Jika status berubah atau alasan berubah:
   - Insert `status_events`.
   - Buat `notifications`.
   - Kirim FCM (bila preferensi aktif), Telegram (bila tertaut), broadcast WebSocket.
8. Broadcast event `reading` ke room pengguna.

**Pseudocode status engine (`packages/shared/src/status-engine.ts`):**

```ts
type Status = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'WATER_LOW';

export function evaluateStatus(r: Reading, cfg: DeviceConfig): {
  status: Status;
  reasons: string[];
} {
  const reasons: string[] = [];
  let critical = false;
  let warning = false;

  // Soil
  if (r.soilMoisture < cfg.thresholds.soil.criticalLow) { critical = true; reasons.push('SOIL_CRITICAL_DRY'); }
  else if (r.soilMoisture > cfg.thresholds.soil.criticalHigh) { critical = true; reasons.push('SOIL_CRITICAL_WET'); }
  else if (r.soilMoisture < cfg.thresholds.soil.warningLow) { warning = true; reasons.push('SOIL_WARNING_DRY'); }
  else if (r.soilMoisture > cfg.thresholds.soil.warningHigh) { warning = true; reasons.push('SOIL_WARNING_WET'); }

  // Temperature
  if (r.temperature < cfg.thresholds.temp.criticalLow) { critical = true; reasons.push('TEMP_CRITICAL_LOW'); }
  else if (r.temperature > cfg.thresholds.temp.criticalHigh) { critical = true; reasons.push('TEMP_CRITICAL_HIGH'); }
  else if (r.temperature < cfg.thresholds.temp.warningLow) { warning = true; reasons.push('TEMP_WARNING_LOW'); }
  else if (r.temperature > cfg.thresholds.temp.warningHigh) { warning = true; reasons.push('TEMP_WARNING_HIGH'); }

  // Humidity
  if (r.humidity < cfg.thresholds.humidity.criticalLow) { critical = true; reasons.push('HUMIDITY_CRITICAL_LOW'); }
  else if (r.humidity > cfg.thresholds.humidity.criticalHigh) { critical = true; reasons.push('HUMIDITY_CRITICAL_HIGH'); }
  else if (r.humidity < cfg.thresholds.humidity.warningLow) { warning = true; reasons.push('HUMIDITY_WARNING_LOW'); }
  else if (r.humidity > cfg.thresholds.humidity.warningHigh) { warning = true; reasons.push('HUMIDITY_WARNING_HIGH'); }

  const waterLow = r.waterLevel < cfg.thresholds.water.criticalLow;
  if (waterLow) reasons.push('WATER_LOW');

  let status: Status;
  if (critical) status = 'CRITICAL';
  else if (waterLow) status = 'WATER_LOW';
  else if (warning) status = 'WARNING';
  else status = 'NORMAL';

  return { status, reasons };
}
```

- WATER LOW tetap dikirim sebagai alasan tambahan saat status CRITICAL.
- Sensor gagal baca → `null`; API menandai `SENSOR_ERROR` dan tidak menganggap nilai normal. Status tidak diturunkan menjadi NORMAL hanya karena data hilang.

### 4.4 Penyiraman Otomatis

Dijalankan **di dua tempat** dengan aturan sama:
- **Firmware ESP32** — eksekusi lokal, tetap berjalan offline (menggunakan config terakhir di NVS).
- **Backend** — evaluasi untuk mencatat dan memberi perintah, tetapi tidak menggandakan aksi jika firmware sudah mengeksekusi.

Aturan:
1. Auto mode harus aktif dan `emergency_latched = false`.
2. `waterLevel` harus ≥ batas WATER LOW, dan float switch (jika ada) tidak menunjukkan low.
3. Kelembapan tanah ≤ `thresholds.soil.warningLow` selama **3 sampel berturut-turut**.
4. Tidak ada cooldown aktif (`now - last_watering_end < cooldown_seconds`).
5. Nyalakan pompa.
6. Hentikan pompa jika salah satu terpenuhi:
   - Kelembapan tanah ≥ `target_moisture` (default 55%).
   - Durasi mencapai `max_pump_seconds` (default 60 detik).
   - WATER LOW terdeteksi.
   - Emergency stop.
   - Perintah manual stop.
7. Catat `watering_events` (trigger `auto`), mulai cooldown.
8. Jika config belum pernah diterima firmware → **auto mode OFF** (safe default, cegah penyiraman berlebihan).

### 4.5 Penyiraman Manual

1. Pengguna memilih durasi (default 10 detik, maks 60 detik).
2. API cek ownership perangkat.
3. API cek kondisi: `waterLevel` aman, tidak emergency, perangkat online (last seen < 3× interval).
4. API buat `watering_events` status `running` dan publish command:
   ```json
   { "id": "cmd_01J...", "type": "pump", "action": "start", "durationSeconds": 10, "issuedAt": "..." }
   ```
   ke `sp/{deviceId}/command` (QoS 1).
5. Device menyalakan pompa, publish ack ke `sp/{deviceId}/ack`:
   ```json
   { "id": "cmd_01J...", "ok": true, "state": "on" }
   ```
6. API menunggu ack maks 5 detik. Tanpa ack → `watering_events.status = timeout`, respons `504 DEVICE_TIMEOUT`.
7. Saat pompa berhenti, device publish state; API menutup event (`completed`/`stopped`).
8. Broadcast WebSocket `watering`.

### 4.6 Emergency Stop

1. **Fisik:** tombol pada perangkat memutus jalur relay (hardware interlock) dan mengeset latch di firmware (NVS).
2. Firmware mematikan pompa, menonaktifkan auto mode, publish status `emergency=true`.
3. **Aplikasi:** `POST /devices/:id/emergency-stop` → API publish command `emergency_stop`.
4. Device ack; API set `devices.emergency_latched=1`.
5. Reset hanya oleh pengguna pemilik: `POST /devices/:id/emergency-reset` → command `emergency_reset`; firmware melepas latch dan mengaktifkan kembali auto mode hanya jika diminta.
6. Semua aksi tercatat di `audit_logs`.

### 4.7 Peringatan

1. Perubahan status → `notifications` dibuat.
2. Kanal:
   - **In-app/WebSocket** — selalu.
   - **Push FCM** — jika `notification_preferences.push` dan ada `push_tokens` aktif.
   - **Telegram** — jika `telegram=1` dan `telegram_chat_id` terisi.
3. Cooldown notifikasi default 15 menit per perangkat per tipe status; `CRITICAL` dan `WATER_LOW` selalu dikirim saat transisi.
4. Retry FCM/Telegram maksimal 3x dengan backoff (job `notification-retry`).
5. Kegagalan kanal tidak memblokir kanal lain; status kirim disimpan di `sent_channels` dan `delivery_attempts`.

### 4.8 Riwayat & Analitik

1. Klien meminta rentang + interval.
2. API memvalidasi rentang: `raw` maks 24 jam; `hour` maks 90 hari; `day` maks 2 tahun.
3. Query `sensor_readings` (raw/hour) atau `readings_daily` (day).
4. Kembalikan titik ter-downsample; web dapat mengekspor CSV.
5. Timezone: simpan UTC; tampilkan sesuai timezone pengguna.

### 4.9 Offline & Reconnect

**Firmware:**
- Buffer maks 100 pembacaan di RAM saat MQTT putus.
- Saat reconnect, kirim buffer berurutan (timestamp asli); API menerima data historis dengan flag.
- Auto watering tetap berjalan lokal.
- Watchdog: pompa dimatikan paksa jika melebihi `max_pump_seconds + 5 detik`.
- LWT `sp/{deviceId}/presence` = `offline` saat koneksi putus.

**Backend:**
- Job `offline-detector` tiap 30 detik: perangkat dengan `last_seen_at` > 3× interval ditandai offline; kirim notifikasi sekali per transisi.
- WebSocket mengirim `device_presence`.

### 4.10 Kalibrasi & Pembacaan Sensor Air

**HC-SR04:**
1. Trigger 10 µs; ukur lebar pulsa ECHO (`pulseIn`, timeout 30 ms).
2. `distance_cm = duration_us × 0.0343 / 2`.
3. Ambil median 5 sampel; buang nilai < 2 cm atau > 400 cm.
4. `level_percent = clamp(((tank_height_cm − distance_cm) / tank_max_level_cm) × 100, 0, 100)`.
5. Jika echo timeout 3x berturut-turut → `waterLevel=null`, `SENSOR_ERROR`, dan **pompa diblokir** (fail-safe).

**Float switch (opsional):**
- Input digital `INPUT_PULLUP`, aktif LOW saat air di bawah batas.
- Debounce 2 detik.
- Jika terpasang, status low dari float switch bersifat otoritatif untuk WATER LOW, menggantikan keputusan ultrasonik.

**Kalibrasi kelembapan tanah:**
- Simpan nilai ADC saat kering udara dan saat jenuh air; konversi linear ke persen.
- Nilai kalibrasi disimpan di NVS dan dapat diperbarui via config.

### Business Rules Ringkas

- Prioritas status: `CRITICAL` > `WATER_LOW` > `WARNING` > `NORMAL`; WATER LOW selalu memblokir pompa.
- Debounce status/penyiraman: 3 sampel berturut-turut.
- Pompa: durasi maksimal 60 detik, cooldown 30 menit, target kelembapan 55% (default, dapat diubah).
- Auto mode default OFF sampai config diterima perangkat.
- Data mentah 90 hari; rollup harian 2 tahun.
- Satu perangkat hanya milik satu akun; akses selalu discope `user_id`.
- Perintah manual ditolak saat WATER LOW, emergency, atau perangkat offline.

---

## 5. Keamanan, Performa, & Deployment

### Keamanan

- **Password:** Argon2id (memory 64 MB, iterations 3, parallelism 4).
- **Token:** access JWT 15 menit; refresh 30 hari dirotasi dan disimpan sebagai hash; revoke saat logout/ganti password.
- **Email/reset token:** hash di DB, sekali pakai, expiry 30 menit (reset) / 24 jam (verifikasi).
- **Otorisasi:** setiap query perangkat memfilter `user_id`; endpoint kontrol memeriksa ownership sebelum publish command.
- **MQTT:** TLS 8883; kredensial unik per device; ACL lewat `/internal/mqtt/acl` membatasi device hanya ke `sp/{deviceId}/#`; API bridge memakai akun service terpisah.
- **Internal endpoint:** `/internal/*` hanya dapat diakses dari jaringan Docker dan dilindungi shared secret.
- **Rate limit:** auth 5/menit/IP; manual watering 10/menit/user; command 20/menit/device; klaim perangkat 5/jam/user. Memakai limiter in-memory (single instance).
- **Input validation:** semua body/query/MQTT payload divalidasi Zod; batas panjang string; reject unknown fields.
- **Web:** cookie refresh `httpOnly`, `Secure`, `SameSite=Lax`; CORS allowlist domain web; CSP; Helmet.
- **Mobile:** token di `flutter_secure_storage`; certificate pinning opsional untuk API; jangan log token/FCM.
- **Secrets:** env/secret manager; tidak pernah masuk repo; rotate MQTT secret saat klaim ulang.
- **Telegram:** webhook diverifikasi header secret; kode tautan sekali pakai 10 menit.
- **Audit log:** perubahan config, perintah pompa, emergency reset, klaim/hapus perangkat.
- **Privasi:** tidak ada PII di telemetry; hapus akun → cascade data pribadi + cabut FCM token + putuskan perangkat.
- **Firmware:** jangan log secret; gunakan NVS terenkripsi bila tersedia; validasi config dari server (rentang wajar).
- **File SQLite:** permission `600`, volume hanya dapat diakses proses API; backup dienkripsi saat disimpan di object storage.

### Performa

- **Dashboard:** baca latest state dari in-memory `Map`; WebSocket untuk update. Jika cache kosong (setelah restart), ambil pembacaan terakhir per perangkat dari SQLite.
- **Ingest:** bridge MQTT memakai antrean batch insert (maks 100 baris / 100 ms) dalam satu transaksi SQLite.
- **SQLite:** WAL, `synchronous=NORMAL`, `busy_timeout=5000`; hindari transaksi panjang; gunakan prepared statement (`better-sqlite3`).
- **Histori:** query memakai PK `(device_id, time)`; `raw` dibatasi 24 jam; `hour` memakai bucketing; `day` memakai `readings_daily`.
- **WebSocket:** room per user; fan-out `EventEmitter` in-process; backpressure dengan drop event `reading` (bukan `status`/`notification`) jika klien lambat.
- **Web:** Next.js caching untuk aset statis, code splitting per route, Recharts lazy-loaded.
- **Mobile:** gambar/ikon di-bundle; chart di-downsample; hindari rebuild seluruh halaman saat satu nilai berubah (Riverpod selector).
- **Target pilot (SQLite):** API p95 < 500 ms; ingest 200 pesan/detik; ≤ 100 perangkat. Target 1.000/5.000 perangkat berlaku setelah migrasi PostgreSQL + Redis.

### Deployment

**Topologi produksi V1:**
- 1 VPS (minimal 2 vCPU / 4 GB RAM) menjalankan Docker Compose:
  - `caddy` — TLS untuk `api.domain.com`, `ws.domain.com`, `mqtt.domain.com`
  - `api` — Fastify
  - `mosquitto` — MQTT TLS 8883
  - volume `./data` — file SQLite + backup
- Web di Vercel (`app.domain.com`).
- Mobile dibuild dengan Flutter (`flutter build appbundle` / `flutter build ipa`) via GitHub Actions; distribusi ke Play Console/App Store Connect.
- Firebase project untuk FCM: `google-services.json` (Android) dan APNs key (iOS) diunggah ke Firebase Console.
- Firewall: hanya 80/443 (Caddy), 8883 (MQTT), 22 (SSH terbatas IP) yang terbuka.

**Lingkungan:**
- `local` — Docker Compose untuk Mosquitto; API/web jalan via `pnpm dev`; SQLite file lokal.
- `staging` — VPS terpisah atau compose profile staging.
- `production` — VPS produksi.

**CI/CD (GitHub Actions):**
1. Lint + typecheck + unit test (`pnpm turbo lint typecheck test`).
2. Build API/web; build firmware (`pio run`); build Flutter (`flutter analyze && flutter test && flutter build apk --release`).
3. Deploy web ke Vercel; deploy API via SSH `docker compose pull && up -d`.
4. Jalankan migrasi SQLite setelah backup otomatis; migrasi harus idempotent.
5. Smoke test `/health` dan `/ready`.

**Backup & Pemulihan:**
- `sqlite3 data/smartplant.db ".backup 'backup/smartplant-YYYYMMDD.db'"` harian via cron.
- Retensi backup 14 hari; salin ke object storage terenkripsi.
- Backup sebelum setiap migrasi.
- Dokumentasi restore di `infra/README`.

**Observability:**
- Log JSON pino (API), level info/warn/error; korelasi `requestId`.
- Sentry untuk error API, web, dan Flutter (`sentry_flutter`).
- Health check + uptime monitor eksternal.
- Metrik MQTT bridge: pesan masuk, gagal validasi, status transisi, latensi ack, ukuran file DB.

**Development Setup:**

```bash
# 1. Prasyarat: Node.js 22+, pnpm 9+, Docker, PlatformIO, Flutter 3.24+
pnpm install

# 2. Infrastruktur lokal (Mosquitto)
docker compose -f infra/docker-compose.yml up -d

# 3. Migrasi database SQLite
pnpm db:migrate

# 4. Jalankan API + web
pnpm dev

# Web:    http://localhost:3000
# API:    http://localhost:3001
# MQTT:   localhost:1883 (tanpa TLS di lokal)
# SQLite: ./data/smartplant.db
```

```bash
# Mobile (Flutter)
cd apps/mobile
flutter pub get
flutter run
```

```bash
# Firmware
cd firmware/esp32
pio run                 # build
pio run -t upload       # flash
pio device monitor      # serial monitor
```

**Testing minimum:**
- Unit test status engine & aturan penyiraman (`vitest`) — wajib.
- Integration test API dengan file SQLite sementara (temp dir) + Mosquitto test container.
- Contract test payload MQTT (Zod).
- E2E web alur login → klaim → monitoring → siram (Playwright).
- Flutter: widget test untuk status card, form login, dan kontrol pompa; integration test alur utama.
- Firmware: unit test parser sensor/rule dengan Unity (PlatformIO), plus uji manual perangkat.

**Konfigurasi default yang di-seed:**
- Profil tanaman sistem: "Tanaman Hias Tropis", "Sukulen", "Sayuran Daun" dengan threshold masing-masing.
- Config perangkat baru: auto mode OFF, interval 30 detik, max pump 60 detik, cooldown 30 menit, target 55%, water source `ultrasonic`.

---

**Tech Spec selesai.** Design System tersedia di `.agents/DESIGN.md`. Langkah berikutnya: task implementasi.
