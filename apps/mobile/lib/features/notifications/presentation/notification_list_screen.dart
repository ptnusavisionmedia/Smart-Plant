import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/models/notification_models.dart';
import '../../../shared/utils/relative_time.dart';
import '../../../shared/widgets/app_state_views.dart';
import '../application/notification_providers.dart';

/// `/notifications` — DESIGN.md "Alert and notification row": unread rows
/// get a severity-tinted background + a text "Baru" label (not just a
/// dot); the row itself is never a destructive action.
class NotificationListScreen extends ConsumerWidget {
  const NotificationListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final state = ref.watch(notificationsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Peringatan'),
        actions: [
          TextButton(
            onPressed: state.unreadCount == 0
                ? null
                : () => ref.read(notificationsControllerProvider.notifier).markAllRead(),
            child: const Text('Tandai semua dibaca'),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(notificationsControllerProvider.notifier).refresh(),
          child: _buildBody(context, ref, state, tokens),
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    NotificationsState state,
    AppTokens tokens,
  ) {
    if (state.isLoading && state.items.isEmpty) {
      return ListView(
        padding: EdgeInsets.all(tokens.spacingLg),
        children: const [
          LoadingSkeleton(height: 72, width: double.infinity),
          SizedBox(height: 8),
          LoadingSkeleton(height: 72, width: double.infinity),
        ],
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorStateView(
        message: 'Gagal memuat peringatan. Periksa koneksi Anda.',
        onRetry: () => ref.read(notificationsControllerProvider.notifier).refresh(),
      );
    }
    if (state.items.isEmpty) {
      return const EmptyStateView(
        icon: Icons.notifications_none,
        title: 'Belum ada peringatan',
        body: 'Peringatan status dan penyiraman akan muncul di sini.',
      );
    }
    return ListView.separated(
      padding: EdgeInsets.all(tokens.spacingLg),
      itemCount: state.items.length,
      separatorBuilder: (_, __) => SizedBox(height: tokens.spacingSm),
      itemBuilder: (context, index) {
        final notification = state.items[index];
        return _NotificationRow(
          notification: notification,
          onTap: () {
            if (notification.isUnread) {
              ref.read(notificationsControllerProvider.notifier).markRead(notification.id);
            }
            if (notification.deviceId != null) {
              context.push('/devices/${notification.deviceId}');
            }
          },
        );
      },
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  Color _background(AppTokens tokens) {
    if (!notification.isUnread) return tokens.backgroundBase;
    switch (notification.type) {
      case NotificationType.emergencyStop:
        return tokens.negativeSubtle;
      case NotificationType.waterLow:
        return tokens.informativeSubtle;
      case NotificationType.deviceOffline:
        return tokens.backgroundPasteboard;
      default:
        return tokens.noticeSubtle;
    }
  }

  IconData _icon() {
    switch (notification.type) {
      case NotificationType.emergencyStop:
        return Icons.report;
      case NotificationType.waterLow:
        return Icons.water_drop_outlined;
      case NotificationType.deviceOffline:
        return Icons.wifi_off;
      case NotificationType.deviceOnline:
        return Icons.wifi;
      case NotificationType.wateringCompleted:
        return Icons.check_circle_outline;
      case NotificationType.statusChange:
        return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Semantics(
      button: true,
      label: '${notification.isUnread ? 'Baru. ' : ''}${notification.title}',
      child: InkWell(
        key: Key('notification_row_${notification.id}'),
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        onTap: onTap,
        child: Container(
          padding: EdgeInsets.all(tokens.spacingMd),
          decoration: BoxDecoration(
            color: _background(tokens),
            borderRadius: BorderRadius.circular(tokens.radiusMd),
            border: Border.all(color: tokens.borderSubtle),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_icon(), size: 20, color: tokens.neutralContent),
              SizedBox(width: tokens.spacingMd),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: tokens.detailStyle.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (notification.isUnread)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: tokens.accent,
                              borderRadius: BorderRadius.circular(tokens.radiusFull),
                            ),
                            child: Text(
                              'Baru',
                              style: tokens.detailStyle.copyWith(color: tokens.onAccent, fontSize: 11),
                            ),
                          ),
                      ],
                    ),
                    SizedBox(height: tokens.spacingXs),
                    Text(notification.body, style: tokens.detailStyle),
                    SizedBox(height: tokens.spacingXs),
                    Text(
                      '${formatRelativeTime(notification.createdAt, DateTime.now())} lalu',
                      style: tokens.detailStyle.copyWith(color: tokens.neutralPlaceholder),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
