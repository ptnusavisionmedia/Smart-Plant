import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/features/watering/application/watering_providers.dart';
import 'package:mobile/features/watering/data/watering_repository.dart';

import 'in_memory_token_storage.dart';

/// A [WateringActionController] whose network calls are replaced with
/// scripted results, so widget tests can exercise "Siram" / "Hentikan
/// pompa" without a live backend.
class FakeWateringActionController extends WateringActionController {
  FakeWateringActionController({this.waterResult = true, this.stopResult = true, this.resetResult = true})
      : super(WateringRepository(apiClient: ApiClient(secureStorage: InMemoryTokenStorage())));

  final bool waterResult;
  final bool stopResult;
  final bool resetResult;

  int waterCallCount = 0;
  int stopCallCount = 0;
  int resetCallCount = 0;
  int? lastDurationSeconds;

  @override
  Future<bool> water(String deviceId, int durationSeconds) async {
    waterCallCount++;
    lastDurationSeconds = durationSeconds;
    state = state.copyWith(lastMessage: waterResult ? 'Penyiraman dimulai' : null);
    return waterResult;
  }

  @override
  Future<bool> emergencyStop(String deviceId) async {
    stopCallCount++;
    state = state.copyWith(lastMessage: stopResult ? 'Pompa dihentikan' : null);
    return stopResult;
  }

  @override
  Future<bool> emergencyReset(String deviceId) async {
    resetCallCount++;
    return resetResult;
  }
}
