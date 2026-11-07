import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/widgets/app_state_views.dart';
import '../../../shared/models/notification_models.dart';
import '../application/notification_providers.dart';

class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final preferencesAsync = ref.watch(notificationPreferencesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Preferensi Notifikasi')),
      body: SafeArea(
        child: preferencesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorStateView(
            message: 'Gagal memuat preferensi.',
            onRetry: () => ref.invalidate(notificationPreferencesProvider),
          ),
          data: (preferences) {
            return ListView(
              padding: EdgeInsets.all(tokens.spacingLg),
              children: [
                SwitchListTile(
                  key: const Key('pref_in_app_switch'),
                  title: const Text('Dalam aplikasi'),
                  subtitle: const Text('Selalu aktif untuk perubahan status.'),
                  value: preferences.inApp,
                  onChanged: (value) => _update(ref, inApp: value),
                ),
                SwitchListTile(
                  key: const Key('pref_push_switch'),
                  title: const Text('Push notification'),
                  value: preferences.push,
                  onChanged: (value) => _update(ref, push: value),
                ),
                SwitchListTile(
                  key: const Key('pref_telegram_switch'),
                  title: const Text('Telegram'),
                  subtitle: Text(
                    preferences.telegramLinked ? 'Tertaut' : 'Belum ditautkan',
                    style: tokens.detailStyle,
                  ),
                  value: preferences.telegram && preferences.telegramLinked,
                  onChanged: preferences.telegramLinked ? (value) => _update(ref, telegram: value) : null,
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _update(WidgetRef ref, {bool? inApp, bool? push, bool? telegram}) async {
    await ref.read(notificationRepositoryProvider).updatePreferences(
          UpdateNotificationPreferencesRequest(inApp: inApp, push: push, telegram: telegram),
        );
    ref.invalidate(notificationPreferencesProvider);
  }
}
