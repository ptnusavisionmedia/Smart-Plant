import 'package:flutter/material.dart';

import '../../app/theme/app_tokens.dart';
import '../utils/relative_time.dart';

/// DESIGN.md "Live and stale indicator": a static dot (never pulsing) +
/// text label + last-update time. Data is only labeled "Live" if the last
/// reading is within 2x the telemetry interval; otherwise it's "Tertunda"
/// with the last update time, never silently re-labeled "Live".
class LiveStaleIndicator extends StatelessWidget {
  const LiveStaleIndicator({
    super.key,
    required this.lastUpdate,
    required this.telemetryIntervalSeconds,
    required this.now,
  });

  final DateTime? lastUpdate;
  final int telemetryIntervalSeconds;

  /// Injected "current time" so this is deterministic in widget tests.
  final DateTime now;

  bool get _isLive {
    if (lastUpdate == null) return false;
    final staleAfter = Duration(seconds: telemetryIntervalSeconds * 2);
    return now.difference(lastUpdate!) <= staleAfter;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isLive = _isLive;
    final dotColor = isLive ? tokens.positive : tokens.neutralSubdued;
    final label = isLive ? 'Live' : 'Tertunda';
    final timeLabel = lastUpdate == null
        ? 'Belum ada data'
        : 'Diperbarui ${formatRelativeTime(lastUpdate!, now)} lalu';

    return Semantics(
      label: '$label, $timeLabel',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(label, style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(width: 6),
          Text(timeLabel, style: tokens.detailStyle),
        ],
      ),
    );
  }
}
