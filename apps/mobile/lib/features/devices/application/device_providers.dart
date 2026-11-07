import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../shared/models/config_models.dart';
import '../../../shared/models/device_models.dart';
import '../../../shared/models/status.dart';
import '../../../shared/models/ws_event_models.dart';
import '../data/device_repository.dart';

final deviceRepositoryProvider = Provider<DeviceRepository>((ref) {
  return DeviceRepository(apiClient: ref.watch(apiClientProvider));
});

/// Single source of truth for the device list: loads `/devices` once, then
/// patches individual devices in place as `reading` / `status` /
/// `device_presence` / `watering` events arrive over the WebSocket (T-44).
/// The device detail screen reads the same list via [deviceByIdProvider]
/// so both screens always agree on the live state.
class DevicesController extends StateNotifier<AsyncValue<List<DeviceSummary>>> {
  DevicesController(this._repository, this._wsEvents) : super(const AsyncValue.loading()) {
    _subscription = _wsEvents?.listen(_handleWsEvent);
    refresh();
  }

  final DeviceRepository _repository;
  final Stream<WsServerEvent>? _wsEvents;
  StreamSubscription<WsServerEvent>? _subscription;

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final devices = await _repository.listDevices();
      state = AsyncValue.data(devices);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  void _handleWsEvent(WsServerEvent event) {
    final current = state.valueOrNull;
    if (current == null) return;

    List<DeviceSummary> updated;
    switch (event) {
      case WsReadingEvent(deviceId: final id, data: final data):
        updated = _updateDevice(current, id, (d) => d.copyWith(
              latest: LatestReadingSnapshot(
                soilMoisture: data.soilMoisture,
                temperature: data.temperature,
                humidity: data.humidity,
                waterLevel: data.waterLevel,
                pumpOn: data.pumpOn,
                ts: data.ts,
              ),
            ));
      case WsStatusEvent(deviceId: final id, status: final status, reasons: final reasons):
        updated = _updateDevice(current, id, (d) => d.copyWith(status: status, reasons: reasons));
      case WsPresenceEvent(deviceId: final id, online: final online, lastSeenAt: final lastSeenAt):
        updated = _updateDevice(
          current,
          id,
          (d) => d.copyWith(isOnline: online, lastSeenAt: lastSeenAt ?? d.lastSeenAt),
        );
      case WsWateringEvent(deviceId: final id, state: final wateringState):
        final pumpOn = wateringState == WsWateringState.running;
        updated = _updateDevice(current, id, (d) {
          final latest = d.latest;
          if (latest == null) return d;
          return d.copyWith(latest: latest.copyWith(pumpOn: pumpOn));
        });
      case WsNotificationEvent():
        updated = current;
    }
    state = AsyncValue.data(updated);
  }

  List<DeviceSummary> _updateDevice(
    List<DeviceSummary> devices,
    String id,
    DeviceSummary Function(DeviceSummary) transform,
  ) {
    return [
      for (final device in devices) if (device.id == id) transform(device) else device,
    ];
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final devicesControllerProvider =
    StateNotifierProvider<DevicesController, AsyncValue<List<DeviceSummary>>>((ref) {
  final wsClient = ref.watch(wsClientProvider);
  return DevicesController(ref.watch(deviceRepositoryProvider), wsClient.events);
});

/// A single device by id, derived from the shared list so the detail
/// screen reflects the same WS-driven updates as the list screen.
final deviceByIdProvider = Provider.family<DeviceSummary?, String>((ref, id) {
  final devices = ref.watch(devicesControllerProvider).valueOrNull;
  if (devices == null) return null;
  for (final device in devices) {
    if (device.id == id) return device;
  }
  return null;
});

/// Convenience: unread/at-risk device status, highest priority first,
/// used for badges elsewhere (e.g. a future "attention needed" count).
int criticalDeviceCount(List<DeviceSummary> devices) =>
    devices.where((d) => d.status == DeviceStatus.critical).length;

/// Device config (thresholds, maxPumpSeconds, telemetry interval) for the
/// watering duration picker and the threshold form (T-45).
final deviceConfigProvider =
    FutureProvider.family.autoDispose<DeviceConfig, String>((ref, deviceId) {
  return ref.watch(deviceRepositoryProvider).getDeviceConfig(deviceId);
});
