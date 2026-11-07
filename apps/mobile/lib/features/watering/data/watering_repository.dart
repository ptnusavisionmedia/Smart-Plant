import '../../../core/api/api_client.dart';
import '../../../shared/models/device_models.dart';

/// `/api/v1/devices/:id/watering`, `/emergency-stop`, `/emergency-reset`
/// (Tech Spec §3/§4.5/§4.6).
class WateringRepository {
  WateringRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  /// Manual watering. Possible errors per Tech Spec §3: `409 WATER_LOW`,
  /// `409 EMERGENCY_STOP`, `409 DEVICE_OFFLINE`, `429 RATE_LIMITED` —
  /// surfaced to the caller as [ApiException] via [ApiClient].
  Future<ManualWateringResponse> startWatering(String deviceId, int durationSeconds) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/devices/$deviceId/watering',
      data: ManualWateringRequest(durationSeconds: durationSeconds).toJson(),
    );
    return ManualWateringResponse.fromJson(response.data!);
  }

  /// Single tap, no confirmation — DESIGN.md: "stopping is the safe
  /// action". Latches `emergency_latched=1` on the device.
  Future<void> emergencyStop(String deviceId) async {
    await _api.post('/devices/$deviceId/emergency-stop');
  }

  /// Requires explicit user confirmation in the UI (unlike stop) because
  /// it re-arms auto mode (Tech Spec §4.6).
  Future<void> emergencyReset(String deviceId) async {
    await _api.post('/devices/$deviceId/emergency-reset');
  }
}
