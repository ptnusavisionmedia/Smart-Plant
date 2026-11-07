import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../../app/theme/app_tokens.dart';
import '../models/status.dart';

/// The moisture ring — the product's signature component (DESIGN.md
/// "Moisture ring (signature)").
///
/// - 72dp on device cards, 120dp on the device detail header.
/// - Track is a 4dp `border-subtle` circle; progress is 4dp in the
///   current status color.
/// - Animates from the previous value over 250ms ease-out when data
///   changes; jumps instantly under reduced motion; never animates
///   continuously.
/// - Always paired with the numeric value and a status label — the ring
///   itself is never the only representation of the data.
/// - `value == null` (sensor failure) shows a dash instead of a percent,
///   per "never fabricate a reading".
class MoistureRing extends StatefulWidget {
  const MoistureRing({
    super.key,
    required this.value,
    required this.status,
    this.size = 72,
    this.showStatusLabel = false,
    this.warningThreshold,
    this.criticalThreshold,
  });

  /// Soil moisture percentage (0-100), or null if the sensor reading is
  /// unavailable.
  final double? value;
  final DeviceStatus status;

  /// 72 for cards, 120 for the detail screen.
  final double size;

  /// Shows the status text below the ring (used on the detail screen;
  /// cards typically show a separate [StatusBadge] instead).
  final bool showStatusLabel;

  /// Threshold tick marks (detail screen only), 0-100.
  final double? warningThreshold;
  final double? criticalThreshold;

  @override
  State<MoistureRing> createState() => _MoistureRingState();
}

class _MoistureRingState extends State<MoistureRing> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  double _previousValue = 0;

  @override
  void initState() {
    super.initState();
    _previousValue = widget.value ?? 0;
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.value = 1;
  }

  @override
  void didUpdateWidget(MoistureRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    final oldValue = oldWidget.value ?? 0;
    final newValue = widget.value ?? 0;
    if (oldValue != newValue) {
      final reduceMotion = SchedulerBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;
      _previousValue = oldValue;
      if (reduceMotion) {
        _controller.value = 1;
        setState(() {});
      } else {
        _controller.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _statusColor(AppTokens tokens) {
    switch (widget.status) {
      case DeviceStatus.normal:
        return tokens.positive;
      case DeviceStatus.warning:
        return tokens.notice;
      case DeviceStatus.critical:
        return tokens.negative;
      case DeviceStatus.waterLow:
        return tokens.informative;
    }
  }

  String _statusLabel() {
    switch (widget.status) {
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

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = _statusColor(tokens);
    final value = widget.value;
    final displayValue = value?.clamp(0, 100).round();
    final semanticsLabel = value == null
        ? 'Kelembapan tanah tidak tersedia, status ${_statusLabel()}'
        : 'Kelembapan tanah $displayValue persen, status ${_statusLabel()}';

    final valueStyle = widget.size >= 100 ? tokens.dataLg : tokens.dataMd;

    return Semantics(
      label: semanticsLabel,
      image: true,
      // The ring's painted percentage and status text are decorative
      // once the explicit label above exists — without this, Flutter
      // merges each descendant Text's own semantics into this node and
      // the announced label becomes "...status Normal\n42%\nNormal"
      // instead of the exact DESIGN.md string.
      child: ExcludeSemantics(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: widget.size,
              height: widget.size,
              child: AnimatedBuilder(
                animation: _animation,
                builder: (context, _) {
                  final animatedValue = value == null
                      ? 0.0
                      : _previousValue + (value - _previousValue) * _animation.value;
                  return CustomPaint(
                    painter: _MoistureRingPainter(
                      progress: (animatedValue / 100).clamp(0, 1),
                      trackColor: tokens.borderSubtle,
                      progressColor: color,
                      strokeWidth: widget.size >= 100 ? 6 : 4,
                      warningThreshold: widget.warningThreshold,
                      criticalThreshold: widget.criticalThreshold,
                      tickColor: tokens.neutralPlaceholder,
                    ),
                    child: Center(
                      child: value == null
                          ? Text('—', style: valueStyle)
                          : RichText(
                              text: TextSpan(
                                style: valueStyle,
                                children: [
                                  TextSpan(text: '$displayValue'),
                                  TextSpan(text: '%', style: tokens.detailStyle),
                                ],
                              ),
                            ),
                    ),
                  );
                },
              ),
            ),
            if (widget.showStatusLabel) ...[
              const SizedBox(height: 8),
              Text(_statusLabel(), style: tokens.labelStyle.copyWith(color: color)),
            ],
          ],
        ),
      ),
    );
  }
}

class _MoistureRingPainter extends CustomPainter {
  _MoistureRingPainter({
    required this.progress,
    required this.trackColor,
    required this.progressColor,
    required this.strokeWidth,
    required this.tickColor,
    this.warningThreshold,
    this.criticalThreshold,
  });

  final double progress;
  final Color trackColor;
  final Color progressColor;
  final double strokeWidth;
  final Color tickColor;
  final double? warningThreshold;
  final double? criticalThreshold;

  static const _startAngle = -math.pi / 2; // -90deg, 12 o'clock

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - strokeWidth) / 2;

    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);

    final progressPaint = Paint()
      ..color = progressColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    final sweep = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      _startAngle,
      sweep,
      false,
      progressPaint,
    );

    void drawTick(double thresholdPercent) {
      final angle = _startAngle + 2 * math.pi * (thresholdPercent / 100);
      final tickPaint = Paint()
        ..color = tickColor
        ..strokeWidth = 1.5;
      final outer = Offset(center.dx + (radius + strokeWidth / 2 + 2) * math.cos(angle),
          center.dy + (radius + strokeWidth / 2 + 2) * math.sin(angle));
      final inner = Offset(center.dx + (radius + strokeWidth / 2 - 2) * math.cos(angle),
          center.dy + (radius + strokeWidth / 2 - 2) * math.sin(angle));
      canvas.drawLine(inner, outer, tickPaint);
    }

    if (warningThreshold != null) drawTick(warningThreshold!);
    if (criticalThreshold != null) drawTick(criticalThreshold!);
  }

  @override
  bool shouldRepaint(covariant _MoistureRingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.progressColor != progressColor ||
        oldDelegate.trackColor != trackColor;
  }
}
