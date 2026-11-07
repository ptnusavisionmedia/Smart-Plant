import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/models/status.dart';
import '../../../shared/widgets/app_state_views.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../notifications/application/notification_providers.dart';
import '../application/device_providers.dart';

/// "Ringkasan" bottom-nav tab: an at-a-glance summary across every
/// device (status counts + most recent alerts), distinct from the full
/// "Perangkat" list tab (DESIGN.md bottom nav: Ringkasan, Perangkat,
/// Peringatan, Pengaturan).
class OverviewScreen extends ConsumerWidget {
  const OverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final devicesAsync = ref.watch(devicesControllerProvider);
    final notifications = ref.watch(notificationsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Ringkasan')),
      body: SafeArea(
        child: devicesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorStateView(
            message: 'Gagal memuat ringkasan. Periksa koneksi Anda.',
            onRetry: () => ref.read(devicesControllerProvider.notifier).refresh(),
          ),
          data: (devices) {
            if (devices.isEmpty) {
              return const EmptyStateView(
                icon: Icons.eco_outlined,
                title: 'Belum ada perangkat',
                body: 'Klaim perangkat pertama Anda di tab Perangkat.',
              );
            }
            final counts = <DeviceStatus, int>{};
            for (final d in devices) {
              counts[d.status] = (counts[d.status] ?? 0) + 1;
            }
            final offlineCount = devices.where((d) => !d.isOnline).length;

            return ListView(
              padding: EdgeInsets.all(tokens.spacingLg),
              children: [
                Text('Status perangkat', style: Theme.of(context).textTheme.headlineSmall),
                SizedBox(height: tokens.spacingMd),
                Wrap(
                  spacing: tokens.spacingSm,
                  runSpacing: tokens.spacingSm,
                  children: [
                    for (final status in DeviceStatus.values)
                      if ((counts[status] ?? 0) > 0)
                        _CountChip(status: status, count: counts[status]!),
                    if (offlineCount > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: tokens.backgroundPasteboard,
                          borderRadius: BorderRadius.circular(tokens.radiusFull),
                        ),
                        child: Text('$offlineCount offline', style: tokens.detailStyle),
                      ),
                  ],
                ),
                SizedBox(height: tokens.spacingXl),
                Row(
                  children: [
                    Text('Peringatan terbaru', style: Theme.of(context).textTheme.headlineSmall),
                    const Spacer(),
                    TextButton(
                      onPressed: () => context.go('/notifications'),
                      child: const Text('Lihat semua'),
                    ),
                  ],
                ),
                SizedBox(height: tokens.spacingMd),
                if (notifications.items.isEmpty)
                  Text('Belum ada peringatan.', style: tokens.detailStyle)
                else
                  for (final notification in notifications.items.take(3))
                    Padding(
                      padding: EdgeInsets.only(bottom: tokens.spacingSm),
                      child: Container(
                        padding: EdgeInsets.all(tokens.spacingMd),
                        decoration: BoxDecoration(
                          color: tokens.backgroundBase,
                          border: Border.all(color: tokens.borderSubtle),
                          borderRadius: BorderRadius.circular(tokens.radiusMd),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(notification.title, style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)),
                            Text(notification.body, style: tokens.detailStyle),
                          ],
                        ),
                      ),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({required this.status, required this.count});

  final DeviceStatus status;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        StatusBadge(status: status),
        const SizedBox(width: 6),
        Text('$count', style: context.tokens.dataSm),
      ],
    );
  }
}
