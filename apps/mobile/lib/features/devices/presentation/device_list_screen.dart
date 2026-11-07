import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/widgets/app_state_views.dart';
import '../../watering/application/watering_providers.dart';
import '../application/device_providers.dart';
import 'device_card.dart';

/// `/` — "Ringkasan": device list + status + recent alerts (Tech Spec
/// Layar Mobile table).
class DeviceListScreen extends ConsumerWidget {
  const DeviceListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final devicesAsync = ref.watch(devicesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Perangkat Saya')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(devicesControllerProvider.notifier).refresh(),
          child: devicesAsync.when(
            loading: () => ListView(
              padding: EdgeInsets.all(tokens.spacingLg),
              children: [
                LoadingSkeleton(height: 180, width: double.infinity),
                SizedBox(height: tokens.spacingMd),
                LoadingSkeleton(height: 180, width: double.infinity),
              ],
            ),
            error: (error, _) => ErrorStateView(
              message: 'Gagal memuat perangkat. Periksa koneksi Anda.',
              onRetry: () => ref.read(devicesControllerProvider.notifier).refresh(),
            ),
            data: (devices) {
              if (devices.isEmpty) {
                return EmptyStateView(
                  icon: Icons.eco_outlined,
                  title: 'Belum ada perangkat',
                  body: 'Klaim perangkat pertama Anda untuk mulai memantau tanaman.',
                  actionLabel: 'Klaim perangkat',
                  onAction: () {},
                );
              }
              return ListView.separated(
                padding: EdgeInsets.all(tokens.spacingLg),
                itemCount: devices.length,
                separatorBuilder: (_, __) => SizedBox(height: tokens.spacingMd),
                itemBuilder: (context, index) {
                  final device = devices[index];
                  return DeviceCard(
                    device: device,
                    onQuickWater: () async {
                      final ok = await ref
                          .read(wateringActionControllerProvider.notifier)
                          .water(device.id, 10);
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(ok ? 'Menyiram ${device.name}' : 'Gagal menyiram')),
                      );
                    },
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}
