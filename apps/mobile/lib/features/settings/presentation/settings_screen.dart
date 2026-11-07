import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../../auth/application/auth_providers.dart';

/// `/settings` — account profile, notification preferences, plant
/// profiles, Telegram, logout (Tech Spec "Layar Mobile").
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final user = ref.watch(authControllerProvider).user;

    return Scaffold(
      appBar: AppBar(title: const Text('Pengaturan')),
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.all(tokens.spacingLg),
          children: [
            if (user != null) ...[
              Text(user.name, style: Theme.of(context).textTheme.headlineSmall),
              SizedBox(height: tokens.spacingXs),
              Text(user.email, style: tokens.detailStyle),
              SizedBox(height: tokens.spacingXl),
            ],
            _SettingsTile(
              icon: Icons.notifications_outlined,
              label: 'Preferensi notifikasi',
              onTap: () => context.push('/settings/notifications'),
            ),
            _SettingsTile(
              icon: Icons.eco_outlined,
              label: 'Profil tanaman',
              onTap: () => context.push('/settings/plant-profiles'),
            ),
            _SettingsTile(
              icon: Icons.telegram,
              label: 'Tautkan Telegram',
              onTap: () {},
            ),
            SizedBox(height: tokens.spacingXl),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                key: const Key('logout_button'),
                onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                child: const Text('Keluar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: tokens.neutralSubdued),
      title: Text(label, style: tokens.labelStyle.copyWith(fontSize: 16)),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
