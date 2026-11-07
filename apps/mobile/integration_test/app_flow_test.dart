// Integration test for the main flow: login -> device list -> device
// detail -> manual watering. Uses a fake Dio HTTP adapter (see
// test/fakes/fake_http_client_adapter.dart) instead of a live backend, per
// the task instructions — `apps/api` isn't guaranteed to be running while
// this suite executes.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mobile/app/app.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/providers.dart';

import '../test/fakes/fake_http_client_adapter.dart';
import '../test/fakes/fake_ws_client.dart';
import '../test/fakes/in_memory_token_storage.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const deviceId = 'dev_1';

  List<FakeRoute> buildRoutes() => [
        FakeRoute(
          method: 'POST',
          pathSuffix: '/auth/login',
          statusCode: 200,
          body: {
            'accessToken': 'fake-access-token',
            'accessTokenExpiresAt': DateTime.now().add(const Duration(minutes: 15)).toIso8601String(),
          },
        ),
        FakeRoute(
          method: 'GET',
          pathSuffix: '/auth/me',
          statusCode: 200,
          body: {
            'id': 'usr_1',
            'name': 'Budi Santoso',
            'email': 'budi@example.com',
            'emailVerified': true,
            'createdAt': '2026-01-01T00:00:00.000Z',
          },
        ),
        FakeRoute(
          method: 'GET',
          pathSuffix: '/devices',
          statusCode: 200,
          body: [
            {
              'id': deviceId,
              'deviceUid': 'esp32-a1b2c3',
              'name': 'Monstera Ruang Tamu',
              'location': 'Ruang Tamu',
              'status': 'NORMAL',
              'reasons': <String>[],
              'isOnline': true,
              'lastSeenAt': DateTime.now().toIso8601String(),
              'autoMode': false,
              'emergencyLatched': false,
              'latest': {
                'soilMoisture': 55.0,
                'temperature': 27.0,
                'humidity': 60.0,
                'waterLevel': 80.0,
                'pumpOn': false,
                'ts': DateTime.now().toIso8601String(),
              },
            },
          ],
        ),
        FakeRoute(
          method: 'GET',
          pathSuffix: '/devices/$deviceId/config',
          statusCode: 200,
          body: {
            'deviceId': deviceId,
            'thresholds': {
              'soil': {'criticalLow': 25, 'warningLow': 40, 'warningHigh': 71, 'criticalHigh': 85},
              'temp': {'criticalLow': 15, 'warningLow': 18, 'warningHigh': 31, 'criticalHigh': 35},
              'humidity': {'criticalLow': 40, 'warningLow': 50, 'warningHigh': 71, 'criticalHigh': 80},
              'water': {'warningLow': 30, 'criticalLow': 15},
            },
            'targetMoisture': 55,
            'maxPumpSeconds': 60,
            'cooldownSeconds': 1800,
            'telemetryIntervalSeconds': 30,
            'waterLevelSource': 'ultrasonic',
            'tankHeightCm': 30,
            'tankMaxLevelCm': 25,
            'configVersion': 1,
          },
        ),
        FakeRoute(
          method: 'POST',
          pathSuffix: '/devices/$deviceId/watering',
          statusCode: 200,
          body: {'commandId': 'cmd_1', 'accepted': true, 'state': 'pending'},
        ),
        FakeRoute(method: 'GET', pathSuffix: '/notifications', statusCode: 200, body: {
          'items': <Map<String, dynamic>>[],
          'nextCursor': null,
          'unreadCount': 0,
        }),
        FakeRoute(
          method: 'GET',
          pathSuffix: '/notification-preferences',
          statusCode: 200,
          body: {'inApp': true, 'push': false, 'telegram': false, 'telegramLinked': false},
        ),
      ];

  testWidgets('login -> device list -> device detail -> watering', (tester) async {
    final fakeAdapter = FakeHttpClientAdapter(buildRoutes());
    final tokenStorage = InMemoryTokenStorage();
    final dio = Dio(BaseOptions(baseUrl: '$kApiBaseUrl/api/v1'))..httpClientAdapter = fakeAdapter;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(tokenStorage),
          apiClientProvider.overrideWithValue(
            ApiClient(secureStorage: tokenStorage, dio: dio),
          ),
          wsClientProvider.overrideWith((ref) => FakeWsClient()),
        ],
        child: const SmartPlantApp(),
      ),
    );

    // Bootstrap's checkSession() runs post-frame; let it settle to /login.
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('login_submit_button')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('login_email_field')), 'budi@example.com');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'secret123');
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pumpAndSettle();

    // Logged in -> redirected to the shell's "Ringkasan" tab.
    expect(find.text('Ringkasan'), findsWidgets);

    // Switch to the "Perangkat" tab to see the device list.
    await tester.tap(find.byKey(const Key('nav_item_Perangkat')));
    await tester.pumpAndSettle();
    expect(find.text('Monstera Ruang Tamu'), findsOneWidget);

    // Open the device detail screen.
    await tester.tap(find.byKey(Key('device_card_$deviceId')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('watering_button')), findsOneWidget);
    expect(find.byKey(const Key('emergency_stop_button')), findsOneWidget);

    // Start a manual watering with the default 10s duration.
    await tester.tap(find.byKey(const Key('watering_button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('watering_confirm_button')));
    await tester.pumpAndSettle();

    expect(find.text('Menyiram selama 10 detik'), findsOneWidget);

    final wateringRequest = fakeAdapter.requestLog.firstWhere(
      (r) => r.method == 'POST' && r.uri.path.endsWith('/devices/$deviceId/watering'),
    );
    expect(wateringRequest.data, isA<Map<String, dynamic>>());
    expect((wateringRequest.data as Map<String, dynamic>)['durationSeconds'], 10);
  });
}
