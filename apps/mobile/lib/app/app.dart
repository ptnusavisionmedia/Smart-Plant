import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers.dart';
import '../features/auth/application/auth_providers.dart';
import '../features/notifications/application/notification_providers.dart';
import '../shared/models/notification_models.dart';
import 'router.dart';
import 'theme/app_theme.dart';

/// Root widget: boots the auth session check, wires `ApiClient`'s
/// session-expiry callback to [AuthController], connects/disconnects the
/// WebSocket as auth state changes, and initializes push + local
/// notifications (T-43/T-44/T-47).
class SmartPlantApp extends ConsumerStatefulWidget {
  const SmartPlantApp({super.key});

  @override
  ConsumerState<SmartPlantApp> createState() => _SmartPlantAppState();
}

class _SmartPlantAppState extends ConsumerState<SmartPlantApp> {
  @override
  void initState() {
    super.initState();
    // Defer provider reads until after the first frame's build completes.
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final apiClient = ref.read(apiClientProvider);
    apiClient.onSessionExpired = () {
      ref.read(authControllerProvider.notifier).forceLogout();
    };

    await ref.read(authControllerProvider.notifier).checkSession();

    final localNotifications = ref.read(localNotificationsServiceProvider);
    await localNotifications.initialize();

    final pushService = ref.read(pushNotificationServiceProvider);
    await pushService.initialize();
    final token = await pushService.getToken();
    if (token != null) {
      // Best-effort registration; failures here shouldn't block startup.
      // ignore: unawaited_futures
      ref.read(notificationRepositoryProvider).registerPushToken(
            RegisterPushTokenRequest(fcmToken: token, platform: _platformName()),
          );
    }
  }

  String _platformName() {
    return Theme.of(context).platform == TargetPlatform.iOS ? 'ios' : 'android';
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authControllerProvider.select((s) => s.status), (previous, next) {
      final wsClient = ref.read(wsClientProvider);
      if (next == AuthStatus.authenticated) {
        wsClient.connect();
      } else if (next == AuthStatus.unauthenticated) {
        wsClient.disconnect();
      }
    });

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Smart Plant',
      theme: AppTheme.light(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        // Support the largest system text scale without truncating labels
        // (DESIGN.md), capped so extreme OS settings don't break layout.
        final mediaQuery = MediaQuery.of(context);
        final clampedScaler = mediaQuery.textScaler.clamp(minScaleFactor: 1.0, maxScaleFactor: 1.6);
        return MediaQuery(
          data: mediaQuery.copyWith(textScaler: clampedScaler),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
