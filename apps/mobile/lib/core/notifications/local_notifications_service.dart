import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Shows a local notification for FCM messages received while the app is
/// in the foreground (FCM does not display anything itself in that case)
/// and surfaces taps on either a local or a system-tray notification as a
/// device id to deep-link to.
class LocalNotificationsService {
  LocalNotificationsService({FlutterLocalNotificationsPlugin? plugin})
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;
  final _tapController = StreamController<String>.broadcast();
  bool _initialized = false;
  int _nextId = 0;

  static const _channel = AndroidNotificationChannel(
    'sp_alerts',
    'Peringatan Tanaman',
    description: 'Notifikasi status, penyiraman, dan peringatan perangkat.',
    importance: Importance.high,
  );

  Stream<String> get onTap => _tapController.stream;

  Future<void> initialize() async {
    if (_initialized) return;
    try {
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosInit = DarwinInitializationSettings();
      await _plugin.initialize(
        const InitializationSettings(android: androidInit, iOS: iosInit),
        onDidReceiveNotificationResponse: (response) {
          final deviceId = response.payload;
          if (deviceId != null && deviceId.isNotEmpty) {
            _tapController.add(deviceId);
          }
        },
      );
      final androidPlugin = _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      await androidPlugin?.createNotificationChannel(_channel);
      _initialized = true;
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[LocalNotificationsService] initialize failed: $error');
      }
    }
  }

  Future<void> showForegroundAlert({
    required String title,
    required String body,
    String? deviceId,
  }) async {
    if (!_initialized) return;
    try {
      await _plugin.show(
        _nextId++,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channel.id,
            _channel.name,
            channelDescription: _channel.description,
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: const DarwinNotificationDetails(),
        ),
        payload: deviceId,
      );
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[LocalNotificationsService] showForegroundAlert failed: $error');
      }
    }
  }
}
