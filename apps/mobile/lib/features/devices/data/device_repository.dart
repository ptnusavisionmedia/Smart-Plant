import '../../../core/api/api_client.dart';
import '../../../shared/models/config_models.dart';
import '../../../shared/models/device_models.dart';

/// `/api/v1/devices*` (Tech Spec §3).
class DeviceRepository {
  DeviceRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<DeviceSummary>> listDevices() async {
    final response = await _api.get<List<dynamic>>('/devices');
    return (response.data ?? [])
        .map((e) => DeviceSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DeviceSummary> claimDevice(ClaimDeviceRequest request) async {
    final response = await _api.post<Map<String, dynamic>>('/devices/claim', data: request.toJson());
    return DeviceSummary.fromJson(response.data!);
  }

  Future<DeviceSummary> getDevice(String id) async {
    final response = await _api.get<Map<String, dynamic>>('/devices/$id');
    return DeviceSummary.fromJson(response.data!);
  }

  Future<DeviceSummary> updateDevice(String id, UpdateDeviceRequest request) async {
    final response = await _api.patch<Map<String, dynamic>>('/devices/$id', data: request.toJson());
    return DeviceSummary.fromJson(response.data!);
  }

  Future<void> deleteDevice(String id) async {
    await _api.delete('/devices/$id');
  }

  Future<DeviceConfig> getDeviceConfig(String id) async {
    // The device detail payload embeds config server-side per the task
    // description; exposed separately here so the threshold form can
    // fetch/refresh it independently of the summary.
    final response = await _api.get<Map<String, dynamic>>('/devices/$id/config');
    return DeviceConfig.fromJson(response.data!);
  }

  Future<DeviceConfig> updateDeviceConfig(String id, UpdateDeviceConfigRequest request) async {
    final response =
        await _api.patch<Map<String, dynamic>>('/devices/$id/config', data: request.toJson());
    return DeviceConfig.fromJson(response.data!);
  }
}
