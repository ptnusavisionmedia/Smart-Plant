# Smart Plant Emergency Detector — Mobile (Flutter)

Module 6 of the Smart Plant Emergency Detector project (Tech Spec §1, Tasks T-42–T-49). Riverpod + go_router + Dio, built against the API contract in `packages/shared/src/schemas/*.ts` and `.agents/2-TECH-SPEC.md` §3. Visual source of truth is `.agents/DESIGN.md` (Adobe Spectrum 2 snapshot).

## Getting started

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001
```

`API_BASE_URL` defaults to `http://localhost:3001` (the local API from Tech Spec's dev setup) if not provided. The app always talks to `<API_BASE_URL>/api/v1`, and derives the WebSocket URL (`/ws`) from the same base.

## Verifying

```bash
flutter analyze
flutter test                                  # unit + widget tests
flutter test integration_test/app_flow_test.dart -d <device>   # see note below
```

## Structure

- `lib/app/` — theme (`AppTokens`/`AppTheme` mapping DESIGN.md tokens), `router.dart` (go_router + auth redirect guard), `app_shell.dart` (4-tab bottom nav), `app.dart` (root widget wiring auth/session/WS/push bootstrap).
- `lib/core/` — `api/` (Dio client with the 401-refresh-retry interceptor), `storage/` (`TokenStorage` interface + `SecureStorage` impl), `ws/` (WebSocket client with reconnect), `notifications/` (push + local notification services).
- `lib/shared/models/` — hand-written Dart models mirroring `packages/shared/src/schemas/*.ts` exactly (field names, nullability, enums). `test/models/model_contract_test.dart` decodes the same example payloads documented in the Tech Spec against these models.
- `lib/shared/widgets/` — `MoistureRing` (signature component), `TankLevelIndicator`, `StatusBadge`, `LiveStaleIndicator`, empty/error/loading state views.
- `lib/features/*` — one folder per module task (`auth`, `devices`, `monitoring` incl. `history`, `watering`, `notifications`, `settings` incl. `config`).

## Manual follow-ups before this ships to production

These two integrations are **stubbed behind interfaces** so the app builds, analyzes, and tests cleanly without them — they are not implemented with real credentials because this environment cannot create a Firebase project or provision a device/emulator:

1. **Push notifications (FCM/APNs).** `lib/core/notifications/firebase_push_notification_service.dart` calls `Firebase.initializeApp()` wrapped in a try/catch; with no `android/app/google-services.json` and no uploaded APNs key, it logs a debug message and every push feature degrades to a safe no-op (`PushNotificationService.getToken()` returns `null`, so `POST /push-tokens` is simply never called). To enable push for real:
   - Create a Firebase project, add the Android app (package `com.smartplant.mobile`) and iOS app, download `google-services.json` into `android/app/`, and add the Android Gradle plugin per the FlutterFire docs.
   - Upload an APNs auth key to the Firebase project for iOS.
   - No app code changes should be required beyond that — `FirebasePushNotificationService` already requests permission, listens for token refresh, and wires foreground/background message handling and the notification-tap deep link to `onNotificationTapDeviceId`.

2. **Bundled font weights.** `assets/fonts/SourceSans3-Variable.ttf` and `SourceCodePro-Regular.ttf` were downloaded from the `google/fonts` GitHub repository (OFL-licensed). Both are **variable fonts** (single file, `wght` axis), not separate static weight files — `google/fonts` only publishes Source Sans 3 as a variable font upstream. `pubspec.yaml` registers the same variable file four times under `weight: 400/600/700/800`, which is Flutter's documented way to select instances of a variable font by weight, so no further action is needed; this is noted here only because the task described downloading "a few static weight files," and the upstream repo does not have those for this family.

No other manual follow-up is required: there is no `google_fonts` runtime dependency anywhere in this app.

## Running `integration_test/app_flow_test.dart`

This integration test (login → device list → device detail → manual watering) runs against a fake Dio HTTP adapter (`test/fakes/fake_http_client_adapter.dart`), not a live backend, so `apps/api` does not need to be running. However, Flutter's `integration_test` package always runs on a real target (unlike plain widget tests), so it needs one of:

- An Android/iOS emulator or physical device, or
- Windows desktop, which additionally requires **Developer Mode** enabled (`start ms-settings:developers`) for the symlink support `flutter build windows` needs.

Neither was available in the environment this module was built in (no AVD provisioned, and enabling Developer Mode is a system setting change outside this task's scope), so this suite is written and passes `flutter analyze`/compiles cleanly, but has not been executed end-to-end here. Run it yourself with `flutter test integration_test/app_flow_test.dart -d <device>` once a device is available.
