import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_tokens.dart';
import '../../../shared/widgets/app_state_views.dart';
import '../application/settings_providers.dart';

/// Lists system + owned plant profiles (`GET /plant-profiles`). Applying a
/// profile to a device happens from the device's threshold config screen
/// (T-45), which lets the user pick one to prefill thresholds from.
class PlantProfilesScreen extends ConsumerWidget {
  const PlantProfilesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final profilesAsync = ref.watch(plantProfilesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profil Tanaman')),
      body: SafeArea(
        child: profilesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorStateView(
            message: 'Gagal memuat profil tanaman.',
            onRetry: () => ref.invalidate(plantProfilesProvider),
          ),
          data: (profiles) {
            if (profiles.isEmpty) {
              return const EmptyStateView(
                icon: Icons.eco_outlined,
                title: 'Belum ada profil',
                body: 'Profil sistem akan muncul di sini.',
              );
            }
            return ListView.separated(
              padding: EdgeInsets.all(tokens.spacingLg),
              itemCount: profiles.length,
              separatorBuilder: (_, __) => SizedBox(height: tokens.spacingSm),
              itemBuilder: (context, index) {
                final profile = profiles[index];
                return Container(
                  padding: EdgeInsets.all(tokens.spacingMd),
                  decoration: BoxDecoration(
                    color: tokens.backgroundBase,
                    borderRadius: BorderRadius.circular(tokens.radiusMd),
                    border: Border.all(color: tokens.borderSubtle),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(profile.name, style: tokens.labelStyle.copyWith(fontSize: 16)),
                            if (profile.isSystem)
                              Padding(
                                padding: EdgeInsets.only(top: tokens.spacingXs),
                                child: Text('Profil sistem', style: tokens.detailStyle),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
