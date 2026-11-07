import '../../../core/api/api_client.dart';
import '../../../shared/models/plant_profile_models.dart';

/// `/api/v1/plant-profiles*` (Tech Spec §3).
class PlantProfileRepository {
  PlantProfileRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<PlantProfile>> list() async {
    final response = await _api.get<List<dynamic>>('/plant-profiles');
    return (response.data ?? [])
        .map((e) => PlantProfile.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PlantProfile> create(CreatePlantProfileRequest request) async {
    final response = await _api.post<Map<String, dynamic>>('/plant-profiles', data: request.toJson());
    return PlantProfile.fromJson(response.data!);
  }

  Future<PlantProfile> update(String id, UpdatePlantProfileRequest request) async {
    final response =
        await _api.patch<Map<String, dynamic>>('/plant-profiles/$id', data: request.toJson());
    return PlantProfile.fromJson(response.data!);
  }

  Future<void> delete(String id) async {
    await _api.delete('/plant-profiles/$id');
  }
}
