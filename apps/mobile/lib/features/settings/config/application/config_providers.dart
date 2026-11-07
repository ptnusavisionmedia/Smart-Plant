import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/models/config_models.dart';
import '../../../devices/application/device_providers.dart';

/// Saves threshold/config edits for a device's `/devices/:id/config`
/// (T-45). Validation mirrors `UpdateDeviceConfigRequestSchema`'s
/// `.refine()`s client-side via [DeviceConfig.validate]/[Thresholds.validate]
/// so the user sees the error before the request ever leaves the device.
class ConfigSaveController extends StateNotifier<AsyncValue<void>> {
  ConfigSaveController(this._ref) : super(const AsyncValue.data(null));

  final Ref _ref;

  Future<bool> save(String deviceId, UpdateDeviceConfigRequest request) async {
    state = const AsyncValue.loading();
    try {
      await _ref.read(deviceRepositoryProvider).updateDeviceConfig(deviceId, request);
      state = const AsyncValue.data(null);
      _ref.invalidate(deviceConfigProvider(deviceId));
      return true;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      return false;
    }
  }
}

final configSaveControllerProvider =
    StateNotifierProvider.autoDispose<ConfigSaveController, AsyncValue<void>>((ref) {
  return ConfigSaveController(ref);
});
