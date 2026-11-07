import '../../../../core/api/api_client.dart';
import '../../../../shared/models/device_models.dart';

/// `GET /devices/:id/readings` (Tech Spec §3/§4.8).
class ReadingsRepository {
  ReadingsRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<ReadingsResponse> getReadings(String deviceId, ReadingsQuery query) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/devices/$deviceId/readings',
      queryParameters: query.toQueryParameters(),
    );
    return ReadingsResponse.fromJson(response.data!);
  }
}
