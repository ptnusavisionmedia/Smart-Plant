import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/models/device_models.dart';
import '../../../shared/models/status.dart';
import '../../../shared/utils/relative_time.dart';
import '../../../shared/widgets/moisture_ring.dart';
import '../../../shared/widgets/status_badge.dart';

/// DESIGN.md "Device card": header (name/location), status badge,
/// moisture ring (72dp), 2x2 metric grid, footer (last seen + quick
/// action). The whole card navigates to detail; "Siram" is a separate
/// button that must not also trigger navigation.
class DeviceCard extends StatelessWidget {
  const DeviceCard({super.key, required this.device, required this.onQuickWater});

  final DeviceSummary device;
  final VoidCallback onQuickWater;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final latest = device.latest;
    final isOffline = !device.isOnline;

    return Semantics(
      button: true,
      label: '${device.name}, status ${_statusLabel(device.status)}',
      child: InkWell(
        key: Key('device_card_${device.id}'),
        borderRadius: BorderRadius.circular(tokens.radiusXl),
        onTap: () => context.push('/devices/${device.id}'),
        child: Container(
          padding: EdgeInsets.all(tokens.spacingLg),
          decoration: BoxDecoration(
            color: tokens.backgroundBase,
            borderRadius: BorderRadius.circular(tokens.radiusXl),
            border: Border.all(color: tokens.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(device.name, style: tokens.labelStyle.copyWith(fontSize: 16)),
                        if (device.location != null) ...[
                          const SizedBox(height: 2),
                          Text(device.location!, style: tokens.detailStyle),
                        ],
                      ],
                    ),
                  ),
                  StatusBadge(status: device.status, isOffline: isOffline),
                ],
              ),
              SizedBox(height: tokens.spacingMd),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  MoistureRing(value: latest?.soilMoisture, status: device.status, size: 72),
                  SizedBox(width: tokens.spacingLg),
                  Expanded(
                    child: GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: tokens.spacingSm,
                      crossAxisSpacing: tokens.spacingSm,
                      childAspectRatio: 2.4,
                      children: [
                        _MetricTile(label: 'Suhu', value: latest?.temperature, unit: '°C'),
                        _MetricTile(label: 'Udara', value: latest?.humidity, unit: '%'),
                        _MetricTile(label: 'Air', value: latest?.waterLevel, unit: '%'),
                        _MetricTile(
                          label: 'Pompa',
                          textValue: latest?.pumpOn == true ? 'Menyala' : 'Mati',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: tokens.spacingMd),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      isOffline
                          ? 'Terakhir terlihat ${device.lastSeenAt == null ? '-' : '${formatRelativeTime(device.lastSeenAt!, DateTime.now())} lalu'}'
                          : 'Diperbarui ${latest == null ? '-' : '${formatRelativeTime(latest.ts, DateTime.now())} lalu'}',
                      style: tokens.detailStyle,
                    ),
                  ),
                  OutlinedButton(
                    key: Key('device_quick_water_${device.id}'),
                    onPressed: isOffline ? null : onQuickWater,
                    style: OutlinedButton.styleFrom(minimumSize: const Size(0, 36)),
                    child: const Text('Siram'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel(DeviceStatus status) {
    switch (status) {
      case DeviceStatus.normal:
        return 'Normal';
      case DeviceStatus.warning:
        return 'Peringatan';
      case DeviceStatus.critical:
        return 'Kritis';
      case DeviceStatus.waterLow:
        return 'Air rendah';
    }
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, this.value, this.unit, this.textValue});

  final String label;
  final double? value;
  final String? unit;
  final String? textValue;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final display = textValue ?? (value == null ? '—' : '${value!.round()}${unit ?? ''}');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tokens.backgroundLayer1,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: tokens.detailStyle),
          Text(display, style: tokens.dataSm),
        ],
      ),
    );
  }
}
