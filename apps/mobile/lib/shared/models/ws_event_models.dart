/// Mirrors `packages/shared/src/schemas/ws-event.ts`.
///
/// `WsServerEvent` is a sealed-style base class (Dart doesn't need the
/// `sealed` keyword to be exhaustive-matched with a switch on `runtimeType`,
/// but we mark it `sealed` anyway for compiler-checked exhaustiveness).
library;

import 'notification_models.dart';
import 'status.dart';

sealed class WsServerEvent {
  const WsServerEvent();

  static WsServerEvent fromJson(Map<String, dynamic> json) {
    switch (json['type'] as String) {
      case 'reading':
        return WsReadingEvent.fromJson(json);
      case 'status':
        return WsStatusEvent.fromJson(json);
      case 'device_presence':
        return WsPresenceEvent.fromJson(json);
      case 'watering':
        return WsWateringEvent.fromJson(json);
      case 'notification':
        return WsNotificationEvent.fromJson(json);
      default:
        throw FormatException('Unknown WsServerEvent type: ${json['type']}');
    }
  }
}

class WsReadingData {
  const WsReadingData({
    required this.soilMoisture,
    required this.temperature,
    required this.humidity,
    required this.waterLevel,
    required this.pumpOn,
    required this.ts,
  });

  final double? soilMoisture;
  final double? temperature;
  final double? humidity;
  final double? waterLevel;
  final bool pumpOn;
  final DateTime ts;

  factory WsReadingData.fromJson(Map<String, dynamic> json) => WsReadingData(
        soilMoisture: (json['soilMoisture'] as num?)?.toDouble(),
        temperature: (json['temperature'] as num?)?.toDouble(),
        humidity: (json['humidity'] as num?)?.toDouble(),
        waterLevel: (json['waterLevel'] as num?)?.toDouble(),
        pumpOn: json['pumpOn'] as bool,
        ts: DateTime.parse(json['ts'] as String),
      );
}

class WsReadingEvent extends WsServerEvent {
  const WsReadingEvent({required this.deviceId, required this.data});

  final String deviceId;
  final WsReadingData data;

  factory WsReadingEvent.fromJson(Map<String, dynamic> json) => WsReadingEvent(
        deviceId: json['deviceId'] as String,
        data: WsReadingData.fromJson(json['data'] as Map<String, dynamic>),
      );
}

class WsStatusEvent extends WsServerEvent {
  const WsStatusEvent({
    required this.deviceId,
    required this.status,
    required this.reasons,
    required this.ts,
  });

  final String deviceId;
  final DeviceStatus status;
  final List<StatusReason> reasons;
  final DateTime ts;

  factory WsStatusEvent.fromJson(Map<String, dynamic> json) => WsStatusEvent(
        deviceId: json['deviceId'] as String,
        status: DeviceStatus.fromJson(json['status'] as String),
        reasons: statusReasonListFromJson(json['reasons'] as List<dynamic>?),
        ts: DateTime.parse(json['ts'] as String),
      );
}

class WsPresenceEvent extends WsServerEvent {
  const WsPresenceEvent({required this.deviceId, required this.online, required this.lastSeenAt});

  final String deviceId;
  final bool online;
  final DateTime? lastSeenAt;

  factory WsPresenceEvent.fromJson(Map<String, dynamic> json) => WsPresenceEvent(
        deviceId: json['deviceId'] as String,
        online: json['online'] as bool,
        lastSeenAt:
            json['lastSeenAt'] == null ? null : DateTime.parse(json['lastSeenAt'] as String),
      );
}

enum WsWateringState {
  running,
  completed,
  stopped,
  rejected,
  timeout;

  static WsWateringState fromJson(String value) =>
      WsWateringState.values.firstWhere((v) => v.name == value);
}

enum WsWateringTrigger {
  auto,
  manual,
  emergency;

  static WsWateringTrigger fromJson(String value) =>
      WsWateringTrigger.values.firstWhere((v) => v.name == value);
}

class WsWateringEvent extends WsServerEvent {
  const WsWateringEvent({
    required this.deviceId,
    required this.state,
    required this.trigger,
    required this.endsAt,
  });

  final String deviceId;
  final WsWateringState state;
  final WsWateringTrigger trigger;
  final DateTime? endsAt;

  factory WsWateringEvent.fromJson(Map<String, dynamic> json) => WsWateringEvent(
        deviceId: json['deviceId'] as String,
        state: WsWateringState.fromJson(json['state'] as String),
        trigger: WsWateringTrigger.fromJson(json['trigger'] as String),
        endsAt: json['endsAt'] == null ? null : DateTime.parse(json['endsAt'] as String),
      );
}

class WsNotificationEvent extends WsServerEvent {
  const WsNotificationEvent({required this.notification});

  final AppNotification notification;

  factory WsNotificationEvent.fromJson(Map<String, dynamic> json) => WsNotificationEvent(
        notification: AppNotification.fromJson(json['notification'] as Map<String, dynamic>),
      );
}
