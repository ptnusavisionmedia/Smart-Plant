import 'package:flutter/material.dart';

import '../../app/theme/app_tokens.dart';
import '../models/status.dart';

/// Status pill widget per DESIGN.md "Status badge": 24dp high, icon +
/// text label always together (never color alone), WATER_LOW is
/// informative blue (not red/critical), offline/sensor-error is neutral
/// gray (not red).
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, this.isOffline = false, this.hasSensorError = false});

  final DeviceStatus status;

  /// When true, overrides [status] visually with the offline treatment —
  /// offline is never the same as a plant emergency.
  final bool isOffline;

  /// When true and [status] isn't already CRITICAL, shows the
  /// sensor-error treatment (also neutral, with a help icon).
  final bool hasSensorError;

  _BadgeSpec _resolveSpec(AppTokens tokens) {
    if (isOffline) {
      return _BadgeSpec(
        background: tokens.backgroundPasteboard,
        foreground: tokens.neutralSubdued,
        icon: Icons.wifi_off,
        label: 'Offline',
      );
    }
    if (hasSensorError) {
      return _BadgeSpec(
        background: tokens.backgroundPasteboard,
        foreground: tokens.neutralSubdued,
        icon: Icons.help_outline,
        label: 'Sensor bermasalah',
      );
    }
    switch (status) {
      case DeviceStatus.normal:
        return _BadgeSpec(
          background: tokens.positiveSubtle,
          foreground: tokens.positiveContent,
          icon: Icons.check_circle,
          label: 'Normal',
        );
      case DeviceStatus.warning:
        return _BadgeSpec(
          background: tokens.noticeSubtle,
          foreground: tokens.noticeContent,
          icon: Icons.warning_amber_rounded,
          label: 'Peringatan',
        );
      case DeviceStatus.critical:
        return _BadgeSpec(
          background: tokens.negativeSubtle,
          foreground: tokens.negativeContent,
          icon: Icons.error,
          label: 'Kritis',
        );
      case DeviceStatus.waterLow:
        return _BadgeSpec(
          background: tokens.informativeSubtle,
          foreground: tokens.informativeContent,
          icon: Icons.water_drop_outlined,
          label: 'Air rendah',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final spec = _resolveSpec(tokens);

    return Semantics(
      label: 'Status: ${spec.label}',
      child: Container(
        height: 24,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: spec.background,
          borderRadius: BorderRadius.circular(tokens.radiusFull),
        ),
        // The icon + text are already fully described by the explicit
        // Semantics label above; excluding them stops Flutter from
        // merging the Text's own auto-generated semantics into a
        // duplicated "Status: Normal, Normal" announcement.
        child: ExcludeSemantics(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(spec.icon, size: 14, color: spec.foreground),
              const SizedBox(width: 6),
              Text(
                spec.label,
                style: tokens.detailStyle.copyWith(color: spec.foreground),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgeSpec {
  _BadgeSpec({required this.background, required this.foreground, required this.icon, required this.label});
  final Color background;
  final Color foreground;
  final IconData icon;
  final String label;
}
