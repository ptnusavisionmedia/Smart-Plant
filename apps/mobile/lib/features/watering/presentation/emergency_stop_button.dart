import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_tokens.dart';
import '../application/watering_providers.dart';

/// DESIGN.md "Emergency" button: 56dp pill, single tap stops the pump
/// immediately — **no confirmation dialog**, because stopping is always
/// the safe action. Disabled only when the device is offline, with the
/// reason shown next to it.
class EmergencyStopButton extends ConsumerWidget {
  const EmergencyStopButton({super.key, required this.deviceId, required this.isOffline});

  final String deviceId;
  final bool isOffline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final actionState = ref.watch(wateringActionControllerProvider);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Expanded(
          child: SizedBox(
            height: 56,
            child: ElevatedButton.icon(
              key: const Key('emergency_stop_button'),
              onPressed: (isOffline || actionState.isSubmitting)
                  ? null
                  : () => _handleStop(context, ref),
              icon: const Icon(Icons.report, size: 20),
              label: const Text('Hentikan pompa'),
              style: ElevatedButton.styleFrom(
                backgroundColor: tokens.negative,
                foregroundColor: tokens.onNegative,
                disabledBackgroundColor: tokens.backgroundPasteboard,
                disabledForegroundColor: tokens.neutralDisabled,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(tokens.radiusFull)),
              ),
            ),
          ),
        ),
        if (isOffline) ...[
          SizedBox(width: tokens.spacingSm),
          Flexible(
            child: Text('Perangkat offline', style: tokens.detailStyle.copyWith(color: tokens.neutralSubdued)),
          ),
        ],
      ],
    );
  }

  Future<void> _handleStop(BuildContext context, WidgetRef ref) async {
    // Intentionally no AlertDialog/confirmation here — see DESIGN.md.
    final ok = await ref.read(wateringActionControllerProvider.notifier).emergencyStop(deviceId);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? 'Pompa dihentikan' : 'Gagal menghentikan pompa')),
    );
  }
}

/// Re-arming auto mode CAN require confirmation (Tech Spec §4.6) since it
/// changes device behavior going forward, unlike the stop action above.
class EmergencyResetButton extends ConsumerWidget {
  const EmergencyResetButton({super.key, required this.deviceId});

  final String deviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final actionState = ref.watch(wateringActionControllerProvider);
    return OutlinedButton(
      key: const Key('emergency_reset_button'),
      onPressed: actionState.isSubmitting ? null : () => _confirmAndReset(context, ref),
      child: const Text('Aktifkan kembali mode otomatis'),
    );
  }

  Future<void> _confirmAndReset(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Aktifkan kembali?'),
        content: const Text(
          'Mode otomatis akan aktif kembali dan pompa dapat menyala tanpa perintah manual.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Aktifkan'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await ref.read(wateringActionControllerProvider.notifier).emergencyReset(deviceId);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? 'Mode otomatis diaktifkan kembali' : 'Gagal mengaktifkan ulang')),
    );
  }
}
