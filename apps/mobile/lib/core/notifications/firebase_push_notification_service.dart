import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'push_notification_service.dart';

/// Must run outside any widget/class so it has a top-level function
/// signature, per `firebase_messaging`'s background handler contract.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundMessageHandler(RemoteMessage message) async {
  // Background isolate: nothing to do beyond letting the system tray
  // notification (sent by FCM's "notification" payload) display itself.
  // Deep-link navigation happens when the user taps it and the app
  // resumes into onNotificationTapDeviceId below.
}

/// Real FCM-backed implementation. Degrades to a safe no-op whenever
/// Firebase isn't configured for this build (no `google-services.json` /
/// APNs key uploaded yet) so the app never crashes without them.
class FirebasePushNotificationService implements PushNotificationService {
  bool _available = false;

  final _tokenController = StreamController<String>.broadcast();
  final _tapController = StreamController<String>.broadcast();

  @override
  Future<void> initialize() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _available = true;

      FirebaseMessaging.onBackgroundMessage(firebaseBackgroundMessageHandler);
      await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);

      FirebaseMessaging.instance.onTokenRefresh.listen((token) {
        if (!_tokenController.isClosed) _tokenController.add(token);
      });

      FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) _handleTap(initialMessage);
    } catch (error, stackTrace) {
      _available = false;
      if (kDebugMode) {
        debugPrint(
          '[FirebasePushNotificationService] Firebase is not configured for '
          'this build (missing google-services.json / APNs key); push is '
          'disabled. Error: $error',
        );
        debugPrintStack(stackTrace: stackTrace);
      }
    }
  }

  void _handleTap(RemoteMessage message) {
    final deviceId = message.data['deviceId'];
    if (deviceId is String && deviceId.isNotEmpty && !_tapController.isClosed) {
      _tapController.add(deviceId);
    }
  }

  @override
  Future<String?> getToken() async {
    if (!_available) return null;
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<String> get onTokenRefresh => _tokenController.stream;

  @override
  Stream<String> get onNotificationTapDeviceId => _tapController.stream;
}
