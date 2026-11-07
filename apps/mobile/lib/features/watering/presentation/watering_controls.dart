import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_tokens.dart';
import '../application/watering_providers.dart';

/// "Siram" primary action (DESIGN.md: one primary action per screen, kept
/// in the bottom action area above the safe-area inset). Duration default
/// 10s, max `maxPumpSeconds` for this device (Tech Spec §4.5), clamped so
/// a smaller device max never offers a longer default.
class WateringButton extends ConsumerWidget {
  const WateringButton({
    super.key,
    required this.deviceId,
    required this.maxPumpSeconds,
    required this.disabled,
    this.disabledReason,
  });

  final String deviceId;
  final int maxPumpSeconds;
  final bool disabled;
  final String? disabledReason;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final actionState = ref.watch(wateringActionControllerProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            key: const Key('watering_button'),
            onPressed: (disabled || actionState.isSubmitting)
                ? null
                : () => _openDurationSheet(context, ref),
            icon: const Icon(Icons.water_drop, size: 16),
            label: const Text('Siram'),
          ),
        ),
        if (disabled && disabledReason != null) ...[
          SizedBox(height: tokens.spacingXs),
          Text(
            disabledReason!,
            style: tokens.detailStyle.copyWith(color: tokens.neutralSubdued),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }

  Future<void> _openDurationSheet(BuildContext context, WidgetRef ref) async {
    final defaultDuration = maxPumpSeconds < 10 ? maxPumpSeconds : 10;
    final duration = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => _DurationSheet(
        initialDuration: defaultDuration,
        maxDuration: maxPumpSeconds,
      ),
    );
    if (duration == null) return;
    final ok = await ref.read(wateringActionControllerProvider.notifier).water(deviceId, duration);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? 'Menyiram selama $duration detik' : 'Gagal memulai penyiraman')),
    );
  }
}

class _DurationSheet extends StatefulWidget {
  const _DurationSheet({required this.initialDuration, required this.maxDuration});

  final int initialDuration;
  final int maxDuration;

  @override
  State<_DurationSheet> createState() => _DurationSheetState();
}

class _DurationSheetState extends State<_DurationSheet> {
  late int _duration;

  @override
  void initState() {
    super.initState();
    _duration = widget.initialDuration;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          tokens.spacingLg,
          tokens.spacingMd,
          tokens.spacingLg,
          tokens.spacingLg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: tokens.borderSubtle,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            SizedBox(height: tokens.spacingLg),
            Text('Durasi penyiraman', style: Theme.of(context).textTheme.headlineSmall),
            SizedBox(height: tokens.spacingSm),
            Text(
              'Maksimal ${widget.maxDuration} detik untuk perangkat ini.',
              style: tokens.detailStyle,
            ),
            SizedBox(height: tokens.spacingLg),
            Text('$_duration detik', style: tokens.dataLg, textAlign: TextAlign.center),
            Slider(
              key: const Key('watering_duration_slider'),
              value: _duration.toDouble(),
              min: 1,
              max: widget.maxDuration.toDouble(),
              divisions: widget.maxDuration > 1 ? widget.maxDuration - 1 : null,
              label: '$_duration detik',
              onChanged: (value) => setState(() => _duration = value.round()),
            ),
            SizedBox(height: tokens.spacingMd),
            ElevatedButton(
              key: const Key('watering_confirm_button'),
              onPressed: () => Navigator.of(context).pop(_duration),
              child: Text('Siram $_duration detik'),
            ),
          ],
        ),
      ),
    );
  }
}
