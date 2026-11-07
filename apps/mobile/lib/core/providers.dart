import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_client.dart';
import 'notifications/firebase_push_notification_service.dart';
import 'notifications/local_notifications_service.dart';
import 'notifications/push_notification_service.dart';
import 'storage/secure_storage.dart';
import 'storage/token_storage.dart';
import 'ws/ws_client.dart';

/// Core singletons shared across features. Kept in one small file so the
/// wiring between the API client's session-expiry callback and the auth
/// controller (set in `app.dart`) is easy to find.
///
/// Typed as [TokenStorage] (not the concrete [SecureStorage]) so tests can
/// override it with an in-memory fake and never touch the
/// `flutter_secure_storage` platform channel.
final secureStorageProvider = Provider<TokenStorage>((ref) => SecureStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(secureStorage: ref.watch(secureStorageProvider));
  ref.onDispose(() => client.onSessionExpired = null);
  return client;
});

final wsClientProvider = Provider<WsClient>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  final client = WsClient(
    getAccessToken: secureStorage.readAccessToken,
    baseUrl: kApiBaseUrl,
  );
  ref.onDispose(client.dispose);
  return client;
});

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return FirebasePushNotificationService();
});

final localNotificationsServiceProvider = Provider<LocalNotificationsService>((ref) {
  return LocalNotificationsService();
});
