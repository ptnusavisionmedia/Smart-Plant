import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/notifications/application/notification_providers.dart';
import 'theme/app_tokens.dart';

/// Bottom navigation shell per DESIGN.md: 4 tabs (Ringkasan, Perangkat,
/// Peringatan, Pengaturan), 64dp + safe-area inset, 48dp touch targets.
/// Unread alerts get an accessible badge ("3 peringatan belum dibaca"),
/// never a bare dot.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    (icon: Icons.dashboard_outlined, selectedIcon: Icons.dashboard, label: 'Ringkasan'),
    (icon: Icons.sensors_outlined, selectedIcon: Icons.sensors, label: 'Perangkat'),
    (icon: Icons.notifications_outlined, selectedIcon: Icons.notifications, label: 'Peringatan'),
    (icon: Icons.settings_outlined, selectedIcon: Icons.settings, label: 'Pengaturan'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final unreadCount = ref.watch(notificationsControllerProvider).unreadCount;
    final currentIndex = navigationShell.currentIndex;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            color: tokens.backgroundBase,
            border: Border(top: BorderSide(color: tokens.borderSubtle)),
          ),
          child: Row(
            children: [
              for (var i = 0; i < _destinations.length; i++)
                Expanded(
                  child: _NavItem(
                    icon: _destinations[i].icon,
                    selectedIcon: _destinations[i].selectedIcon,
                    label: _destinations[i].label,
                    isSelected: i == currentIndex,
                    badgeCount: i == 2 ? unreadCount : 0,
                    onTap: () => navigationShell.goBranch(i, initialLocation: i == currentIndex),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.isSelected,
    required this.badgeCount,
    required this.onTap,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool isSelected;
  final int badgeCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = isSelected ? tokens.accent : tokens.neutralSubdued;
    final semanticsLabel =
        badgeCount > 0 ? '$label, $badgeCount peringatan belum dibaca' : label;

    return Semantics(
      label: semanticsLabel,
      selected: isSelected,
      button: true,
      child: InkWell(
        key: Key('nav_item_$label'),
        onTap: onTap,
        child: SizedBox(
          height: 64,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(isSelected ? selectedIcon : icon, size: 24, color: color),
                  if (badgeCount > 0)
                    Positioned(
                      right: -6,
                      top: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: tokens.negative,
                          borderRadius: BorderRadius.circular(tokens.radiusFull),
                        ),
                        constraints: const BoxConstraints(minWidth: 16),
                        child: Text(
                          '$badgeCount',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }
}
