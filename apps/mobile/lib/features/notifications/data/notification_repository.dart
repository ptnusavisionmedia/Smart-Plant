import '../../../core/api/api_client.dart';
import '../../../shared/models/notification_models.dart';

/// `/api/v1/notifications*`, `/notification-preferences`, `/push-tokens`
/// (Tech Spec §3).
class NotificationRepository {
  NotificationRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<NotificationListResponse> list({String? cursor}) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/notifications',
      queryParameters: cursor != null ? {'cursor': cursor} : null,
    );
    return NotificationListResponse.fromJson(response.data!);
  }

  Future<void> markRead(String id) async {
    await _api.patch('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _api.patch('/notifications/read-all');
  }

  Future<NotificationPreferences> getPreferences() async {
    final response = await _api.get<Map<String, dynamic>>('/notification-preferences');
    return NotificationPreferences.fromJson(response.data!);
  }

  Future<NotificationPreferences> updatePreferences(
    UpdateNotificationPreferencesRequest request,
  ) async {
    final response = await _api.patch<Map<String, dynamic>>(
      '/notification-preferences',
      data: request.toJson(),
    );
    return NotificationPreferences.fromJson(response.data!);
  }

  Future<void> registerPushToken(RegisterPushTokenRequest request) async {
    await _api.post('/push-tokens', data: request.toJson());
  }

  Future<void> revokePushToken(String token) async {
    await _api.delete('/push-tokens/$token');
  }
}
