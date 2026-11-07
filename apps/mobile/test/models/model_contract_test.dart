// Verifies the hand-written Dart models in lib/shared/models/* decode the
// same sample payloads documented against the canonical Zod schemas in
// packages/shared/src/schemas/*.ts and Tech Spec §3 "Contoh Kontrak
// Penting", per the instruction in Tech Spec §3's note on Dart models:
// "harus diuji terhadap contoh payload yang sama".
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/shared/models/auth_models.dart';
import 'package:mobile/shared/models/config_models.dart';
import 'package:mobile/shared/models/device_models.dart';
import 'package:mobile/shared/models/notification_models.dart';
import 'package:mobile/shared/models/plant_profile_models.dart';
import 'package:mobile/shared/models/status.dart';
import 'package:mobile/shared/models/ws_event_models.dart';

void main() {
  group('auth models', () {
    test('UserProfile.fromJson decodes the /auth/me shape', () {
      final profile = UserProfile.fromJson({
        'id': 'usr_1',
        'name': 'Budi',
        'email': 'budi@example.com',
        'emailVerified': true,
        'createdAt': '2026-01-01T00:00:00.000Z',
      });
      expect(profile.id, 'usr_1');
      expect(profile.emailVerified, isTrue);
    });

    test('AuthTokens.fromJson decodes the login response shape', () {
      final tokens = AuthTokens.fromJson({
        'accessToken': 'abc.def.ghi',
        'accessTokenExpiresAt': '2026-01-01T00:15:00.000Z',
      });
      expect(tokens.accessToken, 'abc.def.ghi');
    });
  });

  group('device models (Tech Spec §3 "Contoh Kontrak Penting")', () {
    test('DeviceSummary.fromJson decodes a POST /devices/claim-shaped response', () {
      final device = DeviceSummary.fromJson({
        'id': '0192f...',
        'deviceUid': 'esp32-a1b2c3',
        'name': 'Monstera Ruang Tamu',
        'location': 'Ruang Tamu',
        'status': 'NORMAL',
        'reasons': <String>[],
        'isOnline': true,
        'lastSeenAt': null,
        'autoMode': false,
        'emergencyLatched': false,
        'latest': null,
      });
      expect(device.status, DeviceStatus.normal);
      expect(device.lastSeenAt, isNull);
      expect(device.latest, isNull);
    });

    test('DeviceSummary round-trips with a non-null latest snapshot and reasons', () {
      final json = {
        'id': 'dev_1',
        'deviceUid': 'esp32-xyz',
        'name': 'Lidah Buaya',
        'location': null,
        'status': 'WATER_LOW',
        'reasons': ['WATER_LOW'],
        'isOnline': true,
        'lastSeenAt': '2026-11-07T10:00:00.000Z',
        'autoMode': true,
        'emergencyLatched': false,
        'latest': {
          'soilMoisture': 43.2,
          'temperature': 27.1,
          'humidity': 64.8,
          'waterLevel': null,
          'pumpOn': false,
          'ts': '2026-11-07T10:00:00.000Z',
        },
      };
      final device = DeviceSummary.fromJson(json);
      expect(device.status, DeviceStatus.waterLow);
      expect(device.reasons, [StatusReason.waterLow]);
      // SENSOR_ERROR rule: a failed water sensor stays null, never 0.
      expect(device.latest!.waterLevel, isNull);
      expect(device.toJson()['status'], 'WATER_LOW');
    });

    test('ManualWateringResponse.fromJson decodes POST /devices/:id/watering response', () {
      final response = ManualWateringResponse.fromJson({
        'commandId': 'cmd_01J...',
        'accepted': true,
        'state': 'pending',
      });
      expect(response.accepted, isTrue);
      expect(response.state, WateringState.pending);
    });

    test('ReadingsResponse.fromJson decodes GET /devices/:id/readings response', () {
      final response = ReadingsResponse.fromJson({
        'interval': 'hour',
        'points': [
          {
            'bucket': '2026-11-07T10:00:00Z',
            'soilMoisture': 43.2,
            'temperature': 27.1,
            'humidity': 64.8,
            'waterLevel': 76.0,
          },
        ],
      });
      expect(response.interval, ReadingsInterval.hour);
      expect(response.points, hasLength(1));
      expect(response.points.first.waterLevel, 76.0);
    });
  });

  group('config models (packages/shared/src/schemas/config.ts refinements)', () {
    Thresholds validThresholds() => Thresholds.fromJson({
          'soil': {'criticalLow': 25, 'warningLow': 40, 'warningHigh': 71, 'criticalHigh': 85},
          'temp': {'criticalLow': 15, 'warningLow': 18, 'warningHigh': 31, 'criticalHigh': 35},
          'humidity': {'criticalLow': 40, 'warningLow': 50, 'warningHigh': 71, 'criticalHigh': 80},
          'water': {'warningLow': 30, 'criticalLow': 15},
        });

    test('decodes the seeded device_configs.thresholds JSON from Tech Spec §2', () {
      final thresholds = validThresholds();
      expect(thresholds.validate(), isEmpty);
      expect(thresholds.soil.criticalLow, 25);
      expect(thresholds.water.criticalLow, 15);
    });

    test('RangeThreshold.validate catches criticalLow >= warningLow', () {
      final bad = RangeThreshold(criticalLow: 40, warningLow: 25, warningHigh: 71, criticalHigh: 85);
      final errors = bad.validate('thresholds.soil');
      expect(errors, isNotEmpty);
      expect(errors.first.path, 'thresholds.soil.criticalLow');
    });

    test('WaterThreshold.validate catches criticalLow >= warningLow', () {
      final bad = WaterThreshold(warningLow: 15, criticalLow: 30);
      final errors = bad.validate('thresholds.water');
      expect(errors, isNotEmpty);
    });

    test('DeviceConfig.validate catches targetMoisture <= soil.warningLow', () {
      final config = DeviceConfig(
        deviceId: 'dev_1',
        thresholds: validThresholds(),
        targetMoisture: 35, // below soil.warningLow (40)
        maxPumpSeconds: 60,
        cooldownSeconds: 1800,
        telemetryIntervalSeconds: 30,
        waterLevelSource: WaterLevelSource.ultrasonic,
        tankHeightCm: 30,
        tankMaxLevelCm: 25,
        configVersion: 1,
      );
      final errors = config.validate();
      expect(errors.any((e) => e.path == 'targetMoisture'), isTrue);
    });

    test('DeviceConfig.validate passes for the Tech Spec seed defaults', () {
      final config = DeviceConfig(
        deviceId: 'dev_1',
        thresholds: validThresholds(),
        targetMoisture: 55,
        maxPumpSeconds: 60,
        cooldownSeconds: 1800,
        telemetryIntervalSeconds: 30,
        waterLevelSource: WaterLevelSource.ultrasonic,
        tankHeightCm: 30,
        tankMaxLevelCm: 25,
        configVersion: 1,
      );
      expect(config.validate(), isEmpty);
    });
  });

  group('notification models', () {
    test('NotificationListResponse.fromJson decodes cursor pagination shape', () {
      final response = NotificationListResponse.fromJson({
        'items': [
          {
            'id': 'n1',
            'deviceId': 'dev_1',
            'type': 'WATER_LOW',
            'title': 'Air rendah',
            'body': 'Isi ulang tangki',
            'reasons': ['WATER_LOW'],
            'readAt': null,
            'createdAt': '2026-11-07T10:00:00.000Z',
          },
        ],
        'nextCursor': 'cursor_abc',
        'unreadCount': 1,
      });
      expect(response.items.single.isUnread, isTrue);
      expect(response.nextCursor, 'cursor_abc');
    });
  });

  group('plant profile models', () {
    test('PlantProfile.fromJson decodes a system profile', () {
      final profile = PlantProfile.fromJson({
        'id': 'pp_1',
        'name': 'Tanaman Hias Tropis',
        'isSystem': true,
        'ownerUserId': null,
        'thresholds': {
          'soil': {'criticalLow': 25, 'warningLow': 40, 'warningHigh': 71, 'criticalHigh': 85},
          'temp': {'criticalLow': 15, 'warningLow': 18, 'warningHigh': 31, 'criticalHigh': 35},
          'humidity': {'criticalLow': 40, 'warningLow': 50, 'warningHigh': 71, 'criticalHigh': 80},
          'water': {'warningLow': 30, 'criticalLow': 15},
        },
      });
      expect(profile.isSystem, isTrue);
      expect(profile.ownerUserId, isNull);
    });
  });

  group('ws-event models (Tech Spec §3 WebSocket examples)', () {
    test('parses a reading event', () {
      final event = WsServerEvent.fromJson({
        'type': 'reading',
        'deviceId': 'dev_1',
        'data': {
          'soilMoisture': 43.2,
          'temperature': 27.1,
          'humidity': 64.8,
          'waterLevel': 76.0,
          'pumpOn': false,
          'ts': '2026-11-07T10:00:00.000Z',
        },
      });
      expect(event, isA<WsReadingEvent>());
      expect((event as WsReadingEvent).data.soilMoisture, 43.2);
    });

    test('parses a status event', () {
      final event = WsServerEvent.fromJson({
        'type': 'status',
        'deviceId': 'dev_1',
        'status': 'WARNING',
        'reasons': ['SOIL_WARNING_DRY'],
        'ts': '2026-11-07T10:00:00.000Z',
      });
      expect(event, isA<WsStatusEvent>());
      expect((event as WsStatusEvent).status, DeviceStatus.warning);
    });

    test('parses a device_presence event', () {
      final event = WsServerEvent.fromJson({
        'type': 'device_presence',
        'deviceId': 'dev_1',
        'online': false,
        'lastSeenAt': '2026-11-07T10:00:00.000Z',
      });
      expect(event, isA<WsPresenceEvent>());
      expect((event as WsPresenceEvent).online, isFalse);
    });

    test('parses a watering event', () {
      final event = WsServerEvent.fromJson({
        'type': 'watering',
        'deviceId': 'dev_1',
        'state': 'running',
        'trigger': 'manual',
        'endsAt': '2026-11-07T10:00:10.000Z',
      });
      expect(event, isA<WsWateringEvent>());
      expect((event as WsWateringEvent).trigger, WsWateringTrigger.manual);
    });

    test('parses a notification event', () {
      final event = WsServerEvent.fromJson({
        'type': 'notification',
        'notification': {
          'id': 'n1',
          'deviceId': 'dev_1',
          'type': 'STATUS_CHANGE',
          'title': 'Status berubah',
          'body': 'Status menjadi WARNING',
          'reasons': <String>[],
          'readAt': null,
          'createdAt': '2026-11-07T10:00:00.000Z',
        },
      });
      expect(event, isA<WsNotificationEvent>());
      expect((event as WsNotificationEvent).notification.readAt, isNull);
    });
  });
}
