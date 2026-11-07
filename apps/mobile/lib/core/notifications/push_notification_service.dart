import 'dart:async';

import 'package:flutter/foundation.dart';

/// Abstraction over FCM so the rest of the app (and widget/integration
/// tests) never touches `firebase_messaging` directly.
///
/// **Manual follow-up required before push actually works in production**
/// (see README): this project has no real Firebase project configured —
/// there is no `android/app/google-services.json` and no uploaded APNs
/// key. [FirebasePushNotificationService] defends against that by
/// catching `Firebase.initializeApp()` failures and degrading to a no-op,
/// so `flutter analyze`/`flutter test`/debug builds all work without it.
abstract class PushNotificationService {
  Future<void> initialize();

  /// Current FCM token, or null if push isn't available (no Firebase
  /// project configured, permission denied, simulator without APNs, etc).
  Future<String?> getToken();

  /// Emits a new token whenever FCM rotates it, so the app can re-register
  /// it with `POST /push-tokens`.
  Stream<String> get onTokenRefresh;

  /// Emits the deep-link device id to open when the user taps a
  /// notification while the app is backgrounded/terminated.
  Stream<String> get onNotificationTapDeviceId;
}

/// Used in tests and whenever Firebase isn't configured. Every call is a
/// safe no-op so features that *use* push never crash in dev/CI.
class NoopPushNotificationService implements PushNotificationService {
  final _tokenController = StreamController<String>.broadcast();
  final _tapController = StreamController<String>.broadcast();

  @override
  Future<void> initialize() async {
    if (kDebugMode) {
      debugPrint(
        '[PushNotificationService] No Firebase project configured; '
        'push notifications are disabled. See README for setup.',
      );
    }
  }

  @override
  Future<String?> getToken() async => null;

  @override
  Stream<String> get onTokenRefresh => _tokenController.stream;

  @override
  Stream<String> get onNotificationTapDeviceId => _tapController.stream;
}
