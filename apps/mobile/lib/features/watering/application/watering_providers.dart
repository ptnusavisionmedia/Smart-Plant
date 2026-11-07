import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/watering_repository.dart';

final wateringRepositoryProvider = Provider<WateringRepository>((ref) {
  return WateringRepository(apiClient: ref.watch(apiClientProvider));
});

/// Tracks the in-flight state of a watering/emergency action per device so
/// buttons can disable themselves and show a spinner without a full
/// screen-level loading flag.
class WateringActionState {
  const WateringActionState({this.isSubmitting = false, this.errorMessage, this.lastMessage});

  final bool isSubmitting;
  final String? errorMessage;
  final String? lastMessage;

  WateringActionState copyWith({bool? isSubmitting, String? errorMessage, String? lastMessage}) =>
      WateringActionState(
        isSubmitting: isSubmitting ?? this.isSubmitting,
        errorMessage: errorMessage,
        lastMessage: lastMessage,
      );
}

class WateringActionController extends StateNotifier<WateringActionState> {
  WateringActionController(this._repository) : super(const WateringActionState());

  final WateringRepository _repository;

  Future<bool> water(String deviceId, int durationSeconds) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null, lastMessage: null);
    try {
      final response = await _repository.startWatering(deviceId, durationSeconds);
      state = state.copyWith(
        isSubmitting: false,
        lastMessage: response.accepted ? 'Penyiraman dimulai' : 'Perintah ditolak',
      );
      return response.accepted;
    } catch (error) {
      state = state.copyWith(isSubmitting: false, errorMessage: _describe(error));
      return false;
    }
  }

  Future<bool> emergencyStop(String deviceId) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null, lastMessage: null);
    try {
      await _repository.emergencyStop(deviceId);
      state = state.copyWith(isSubmitting: false, lastMessage: 'Pompa dihentikan');
      return true;
    } catch (error) {
      state = state.copyWith(isSubmitting: false, errorMessage: _describe(error));
      return false;
    }
  }

  Future<bool> emergencyReset(String deviceId) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null, lastMessage: null);
    try {
      await _repository.emergencyReset(deviceId);
      state = state.copyWith(isSubmitting: false, lastMessage: 'Mode otomatis diaktifkan kembali');
      return true;
    } catch (error) {
      state = state.copyWith(isSubmitting: false, errorMessage: _describe(error));
      return false;
    }
  }

  String _describe(Object error) {
    final message = error.toString();
    if (message.contains('WATER_LOW')) return 'Air tangki rendah. Isi ulang sebelum menyiram.';
    if (message.contains('EMERGENCY_STOP')) return 'Perangkat dalam mode berhenti darurat.';
    if (message.contains('DEVICE_OFFLINE')) return 'Perangkat offline.';
    if (message.contains('RATE_LIMITED')) return 'Terlalu banyak permintaan. Coba lagi sebentar.';
    if (message.contains('DEVICE_TIMEOUT')) return 'Perangkat tidak merespons. Coba lagi.';
    return 'Gagal mengirim perintah. Coba lagi.';
  }
}

final wateringActionControllerProvider =
    StateNotifierProvider.autoDispose<WateringActionController, WateringActionState>((ref) {
  return WateringActionController(ref.watch(wateringRepositoryProvider));
});
