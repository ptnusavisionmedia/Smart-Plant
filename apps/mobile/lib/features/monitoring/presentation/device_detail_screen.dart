import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/widgets/app_state_views.dart';
import '../../../shared/widgets/live_stale_indicator.dart';
import '../../../shared/widgets/moisture_ring.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/tank_level_indicator.dart';
import '../../devices/application/device_providers.dart';
import '../../watering/presentation/emergency_stop_button.dart';
import '../../watering/presentation/watering_controls.dart';

/// `/devices/:id` — real-time monitoring, Siram, and Hentikan pompa kept
/// in the bottom action area above the safe-area inset (DESIGN.md).
class DeviceDetailScreen extends ConsumerWidget {
  const DeviceDetailScreen({super.key, required this.deviceId});

  final String deviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final device = ref.watch(deviceByIdProvider(deviceId));
    final devicesAsync = ref.watch(devicesControllerProvider);
    final configAsync = ref.watch(deviceConfigProvider(deviceId));

    if (devicesAsync.isLoading && device == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (device == null) {
      return Scaffold(
        appBar: AppBar(),
        body: ErrorStateView(
          message: 'Perangkat tidak ditemukan.',
          onRetry: () => ref.read(devicesControllerProvider.notifier).refresh(),
        ),
      );
    }

    final latest = device.latest;
    final isOffline = !device.isOnline;
    final maxPumpSeconds = configAsync.valueOrNull?.maxPumpSeconds ?? 60;
    final telemetryInterval = configAsync.valueOrNull?.telemetryIntervalSeconds ?? 30;

    String? disabledReason;
    final waterLevel = latest?.waterLevel;
    if (isOffline) {
      disabledReason = 'Perangkat offline';
    } else if (device.emergencyLatched) {
      disabledReason = 'Perangkat dalam mode berhenti darurat';
    } else if (waterLevel != null && waterLevel < TankLevelIndicator.waterLowMarker) {
      disabledReason = 'Air tangki rendah, isi ulang sebelum menyiram';
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(device.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Riwayat',
            onPressed: () => context.push('/devices/$deviceId/history'),
          ),
          IconButton(
            icon: const Icon(Icons.tune),
            tooltip: 'Pengaturan ambang batas',
            onPressed: () => context.push('/devices/$deviceId/config'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: EdgeInsets.all(tokens.spacingLg),
                children: [
                  if (device.location != null)
                    Padding(
                      padding: EdgeInsets.only(bottom: tokens.spacingMd),
                      child: Text(device.location!, style: tokens.detailStyle),
                    ),
                  Row(
                    children: [
                      StatusBadge(
                        status: device.status,
                        isOffline: isOffline,
                        hasSensorError: latest?.soilMoisture == null && !isOffline,
                      ),
                      const Spacer(),
                      LiveStaleIndicator(
                        lastUpdate: latest?.ts,
                        telemetryIntervalSeconds: telemetryInterval,
                        now: DateTime.now(),
                      ),
                    ],
                  ),
                  SizedBox(height: tokens.spacingXl),
                  Center(
                    child: MoistureRing(
                      value: latest?.soilMoisture,
                      status: device.status,
                      size: 120,
                      showStatusLabel: true,
                      warningThreshold: configAsync.valueOrNull?.thresholds.soil.warningLow,
                      criticalThreshold: configAsync.valueOrNull?.thresholds.soil.criticalLow,
                    ),
                  ),
                  SizedBox(height: tokens.spacingXl),
                  Container(
                    padding: EdgeInsets.all(tokens.spacingLg),
                    decoration: BoxDecoration(
                      color: tokens.backgroundBase,
                      borderRadius: BorderRadius.circular(tokens.radiusXl),
                      border: Border.all(color: tokens.borderSubtle),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Level Air', style: Theme.of(context).textTheme.headlineSmall),
                        SizedBox(height: tokens.spacingMd),
                        TankLevelIndicator(levelPercent: waterLevel, height: 120, compact: false),
                      ],
                    ),
                  ),
                  SizedBox(height: tokens.spacingLg),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: tokens.spacingSm,
                    crossAxisSpacing: tokens.spacingSm,
                    childAspectRatio: 2.2,
                    children: [
                      _DetailMetricTile(label: 'Suhu', value: latest?.temperature, unit: '°C'),
                      _DetailMetricTile(label: 'Kelembapan udara', value: latest?.humidity, unit: '%'),
                      _DetailMetricTile(
                        label: 'Pompa',
                        textValue: latest?.pumpOn == true ? 'Menyala' : 'Mati',
                      ),
                      _DetailMetricTile(
                        label: 'Mode otomatis',
                        textValue: device.autoMode ? 'Aktif' : 'Nonaktif',
                      ),
                    ],
                  ),
                  if (device.emergencyLatched) ...[
                    SizedBox(height: tokens.spacingLg),
                    EmergencyResetButton(deviceId: deviceId),
                  ],
                ],
              ),
            ),
            Container(
              padding: EdgeInsets.fromLTRB(
                tokens.spacingLg,
                tokens.spacingMd,
                tokens.spacingLg,
                tokens.spacingMd,
              ),
              decoration: BoxDecoration(
                color: tokens.backgroundBase,
                border: Border(top: BorderSide(color: tokens.borderSubtle)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  WateringButton(
                    deviceId: deviceId,
                    maxPumpSeconds: maxPumpSeconds,
                    disabled: disabledReason != null,
                    disabledReason: disabledReason,
                  ),
                  SizedBox(height: tokens.spacingMd),
                  EmergencyStopButton(deviceId: deviceId, isOffline: isOffline),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailMetricTile extends StatelessWidget {
  const _DetailMetricTile({required this.label, this.value, this.unit, this.textValue});

  final String label;
  final double? value;
  final String? unit;
  final String? textValue;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final display = textValue ?? (value == null ? '—' : '${value!.toStringAsFixed(1)}${unit ?? ''}');
    return Container(
      padding: EdgeInsets.all(tokens.spacingMd),
      decoration: BoxDecoration(
        color: tokens.backgroundLayer1,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: tokens.detailStyle),
          Text(display, style: tokens.dataMd),
        ],
      ),
    );
  }
}
