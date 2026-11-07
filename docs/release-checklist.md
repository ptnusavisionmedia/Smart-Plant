# Release Checklist (T-55)

## Web (`apps/web`, deploy target: Vercel per T-53)

**App metadata**: `@smart-plant/web`, Next.js 14.2.18 App Router.

Pre-deploy:
- [ ] `pnpm --filter @smart-plant/web run build` — passes (verified: all 11 routes compile/typecheck/prerender)
- [ ] `pnpm --filter @smart-plant/web run typecheck` — passes (verified, no errors)
- [ ] `pnpm --filter @smart-plant/web run lint` — passes (verified, no warnings)
- [ ] Set production env vars in Vercel: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` (see `apps/web/.env.example`) pointing at the real deployed API, not `localhost`
- [ ] CORS: confirm the API's `CORS_ALLOWED_ORIGINS` includes the Vercel production domain (and any preview-deployment domains you want to allow)
- [ ] Confirm the refresh-token cookie's `SameSite`/domain settings still work across the web's domain and the API's domain being different (cross-site cookie — verify login/refresh actually works against a deployed API, not just localhost; this was **not** verified in this sandbox since no live API was running during the web build)
- [ ] Click through the golden path against a real deployed API once both are up: register → claim a device → see live telemetry (via `tools/device-simulator` or Wokwi) → manual watering → notifications
- [ ] Lighthouse / basic a11y spot-check (T-41's formal audit tooling wasn't set up — see "Known gaps" below)

## Mobile (`apps/mobile`, Flutter — Android + iOS)

**App metadata**: name `mobile` (display name should be set to "Smart Plant" or similar before store submission — not yet set), package `com.smartplant.mobile` (both Android `applicationId` and iOS `PRODUCT_BUNDLE_IDENTIFIER`), version `1.0.0+1`.

Pre-submission:
- [ ] `flutter analyze` — passes (verified, clean)
- [ ] `flutter test` — 38/38 passing (verified)
- [ ] Build a release APK/AAB: **blocked in this sandbox** — the mobile module's own report noted a Gradle daemon crash preventing a release build here. Re-attempt on a machine with a working Android SDK/Gradle setup before trusting this is submittable.
- [ ] Build a release iOS archive — not attempted in this sandbox (no macOS/Xcode here); needs a Mac.
- [ ] `integration_test/app_flow_test.dart` — not run in this sandbox (needs an emulator/device, per the mobile module's report)
- [ ] App icon, splash screen, and store screenshots — not yet produced
- [ ] Display name — set a real app name (currently the Flutter project name `mobile`) in `android/app/src/main/AndroidManifest.xml` (`android:label`) and `ios/Runner/Info.plist` (`CFBundleDisplayName`) before submitting

### Play Store metadata (fill in before submission)

| Field | Value |
|---|---|
| Package name | `com.smartplant.mobile` |
| App category | Tools / Productivity (or "House & Home" if available) |
| Short description | Draft: "Pantau dan siram tanaman otomatis dengan Smart Plant Emergency Detector." |
| Privacy policy URL | **Needed** — not yet published anywhere; required by Play Console before submission |
| Data safety form | Declare: account email (auth), device telemetry (not shared with third parties), push token (FCM) |
| Content rating questionnaire | Everyone / no mature content |

### App Store metadata (fill in before submission)

| Field | Value |
|---|---|
| Bundle ID | `com.smartplant.mobile` |
| Category | Utilities or Lifestyle |
| Privacy policy URL | Same requirement as Play Store — needed before submission |
| App Privacy ("nutrition label") | Account email, device data, push notifications — not linked to third-party advertising |
| Export compliance | No encryption beyond HTTPS/TLS — standard exemption typically applies, confirm at submission time |

## Backend readiness gate (both store submissions depend on this)

- [ ] Production API deployed and reachable over HTTPS (T-53)
- [ ] Backup/restore drill actually run once against the production stack (T-54, see `docs/runbook.md`)
- [ ] Load test run against a live broker, not just the parts verified in this sandbox (`docs/performance.md` §3/§4 — MQTT ingest and WS fan-out)
- [ ] Telegram bot verified against a real Telegram client sending/receiving messages (built and wired, long-polling confirmed on every server boot in this session, but not exercised against the real Telegram API with a live chat in this sandbox)

## Known gaps carried into this checklist (be honest about these before shipping)

- Firmware/production-broker MQTT auth gap — see [`docs/provisioning.md`](provisioning.md) "Known gap". Real hardware against the secure broker is not yet wired up; only the Wokwi demo (public broker, no auth) and the device simulator are verified working paths.
- Mobile release build and integration test — blocked by this sandbox's environment, not by the code; re-verify on real Android/iOS toolchains.
- Web's login/refresh-cookie behavior across two different production domains (web on Vercel, API elsewhere) — not exercised against a live deployment.
