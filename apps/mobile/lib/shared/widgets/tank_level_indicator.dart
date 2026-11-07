import 'package:flutter/material.dart';

import '../../app/theme/app_tokens.dart';

/// Vertical tank level gauge per DESIGN.md "Tank level indicator".
///
/// - 8dp wide track, 200dp tall on detail / 72dp tall on cards.
/// - Fill uses `chart-water`; markers at 15% (WATER LOW) and 30%
///   (warning).
/// - **Never shows 0% on sensor failure** — `level == null` shows
///   "Level air tidak tersedia" with the offline badge treatment instead
///   of a fabricated reading.
class TankLevelIndicator extends StatelessWidget {
  const TankLevelIndicator({
    super.key,
    required this.levelPercent,
    this.height = 72,
    this.compact = true,
  });

  /// Water level percentage (0-100), or null if the HC-SR04 reading is
  /// invalid (3 consecutive echo timeouts per Tech Spec §4.10).
  final double? levelPercent;
  final double height;
  final bool compact;

  static const double waterLowMarker = 15;
  static const double warningMarker = 30;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    if (levelPercent == null) {
      return Semantics(
        label: 'Level air tidak tersedia',
        child: SizedBox(
          height: height,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.help_outline, size: 16, color: tokens.neutralSubdued),
                  const SizedBox(width: 6),
                  Text('Level air tidak tersedia', style: tokens.detailStyle),
                ],
              ),
              if (!compact) ...[
                const SizedBox(height: 4),
                Text(
                  'Sensor air tidak terbaca. Penyiraman diblokir demi keamanan.',
                  style: tokens.detailStyle,
                ),
              ],
            ],
          ),
        ),
      );
    }

    final clamped = levelPercent!.clamp(0, 100);
    final isWaterLow = clamped < waterLowMarker;
    final fillColor = tokens.chartWater;

    final gauge = SizedBox(
      width: 8,
      height: height,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          Container(
            width: 8,
            height: height,
            decoration: BoxDecoration(
              color: tokens.borderSubtle,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          Container(
            width: 8,
            height: height * (clamped / 100),
            decoration: BoxDecoration(
              color: fillColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          Positioned(
            bottom: height * (waterLowMarker / 100),
            child: Container(width: 14, height: 1.5, color: tokens.negative),
          ),
          Positioned(
            bottom: height * (warningMarker / 100),
            child: Container(width: 14, height: 1.5, color: tokens.notice),
          ),
        ],
      ),
    );

    return Semantics(
      label: 'Level air ${clamped.round()} persen${isWaterLow ? ', air rendah' : ''}',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          gauge,
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Air ${clamped.round()}%', style: tokens.dataSm),
              if (isWaterLow) ...[
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: tokens.informativeSubtle,
                    borderRadius: BorderRadius.circular(tokens.radiusFull),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.water_drop_outlined, size: 12, color: tokens.informativeContent),
                      const SizedBox(width: 4),
                      Text(
                        'Isi ulang tangki',
                        style: tokens.detailStyle.copyWith(color: tokens.informativeContent),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
