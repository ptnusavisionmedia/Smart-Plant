import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/application/auth_providers.dart';
import '../features/auth/presentation/forgot_password_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/devices/presentation/device_list_screen.dart';
import '../features/devices/presentation/overview_screen.dart';
import '../features/monitoring/history/presentation/history_screen.dart';
import '../features/monitoring/presentation/device_detail_screen.dart';
import '../features/notifications/presentation/notification_list_screen.dart';
import '../features/notifications/presentation/notification_preferences_screen.dart';
import '../features/settings/config/presentation/threshold_config_screen.dart';
import '../features/settings/presentation/plant_profiles_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import 'app_shell.dart';

/// Notifies [GoRouter] to re-run its `redirect` whenever [AuthState]
/// changes (e.g. login, logout, or `ApiClient.onSessionExpired` forcing a
/// logout after a failed refresh).
class _AuthRefreshListenable extends ChangeNotifier {
  _AuthRefreshListenable(Ref ref) {
    ref.listen(authControllerProvider.select((s) => s.status), (_, __) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _AuthRefreshListenable(ref);
  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final isAuthRoute = _authRoutes.any((r) => state.matchedLocation.startsWith(r));

      if (authState.status == AuthStatus.unknown) {
        // Still checking secure storage; don't redirect yet.
        return null;
      }
      if (authState.status != AuthStatus.authenticated && !isAuthRoute) {
        return '/login';
      }
      if (authState.status == AuthStatus.authenticated && isAuthRoute) {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (context, state) => const OverviewScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/devices',
              builder: (context, state) => const DeviceListScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (context, state) =>
                      DeviceDetailScreen(deviceId: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'history',
                      builder: (context, state) =>
                          HistoryScreen(deviceId: state.pathParameters['id']!),
                    ),
                    GoRoute(
                      path: 'config',
                      builder: (context, state) =>
                          ThresholdConfigScreen(deviceId: state.pathParameters['id']!),
                    ),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/notifications', builder: (context, state) => const NotificationListScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsScreen(),
              routes: [
                GoRoute(
                  path: 'notifications',
                  builder: (context, state) => const NotificationPreferencesScreen(),
                ),
                GoRoute(
                  path: 'plant-profiles',
                  builder: (context, state) => const PlantProfilesScreen(),
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
});

const _authRoutes = ['/login', '/register', '/forgot-password'];
