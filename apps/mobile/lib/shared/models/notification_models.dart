/// Mirrors `packages/shared/src/schemas/notification.ts`.
library;

import 'status.dart';

enum NotificationType {
  statusChange,
  waterLow,
  deviceOffline,
  deviceOnline,
  wateringCompleted,
  emergencyStop;

  static const Map<String, NotificationType> _byJson = {
    'STATUS_CHANGE': NotificationType.statusChange,
    'WATER_LOW': NotificationType.waterLow,
    'DEVICE_OFFLINE': NotificationType.deviceOffline,
    'DEVICE_ONLINE': NotificationType.deviceOnline,
    'WATERING_COMPLETED': NotificationType.wateringCompleted,
    'EMERGENCY_STOP': NotificationType.emergencyStop,
  };

  static NotificationType fromJson(String value) {
    final match = _byJson[value];
    if (match == null) throw FormatException('Unknown NotificationType: $value');
    return match;
  }

  String toJson() => _byJson.entries.firstWhere((e) => e.value == this).key;
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.deviceId,
    required this.type,
    required this.title,
    required this.body,
    required this.reasons,
    required this.readAt,
    required this.createdAt,
  });

  final String id;
  final String? deviceId;
  final NotificationType type;
  final String title;
  final String body;
  final List<StatusReason> reasons;
  final DateTime? readAt;
  final DateTime createdAt;

  bool get isUnread => readAt == null;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String,
        deviceId: json['deviceId'] as String?,
        type: NotificationType.fromJson(json['type'] as String),
        title: json['title'] as String,
        body: json['body'] as String,
        reasons: statusReasonListFromJson(json['reasons'] as List<dynamic>?),
        readAt: json['readAt'] == null ? null : DateTime.parse(json['readAt'] as String),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'deviceId': deviceId,
        'type': type.toJson(),
        'title': title,
        'body': body,
        'reasons': statusReasonListToJson(reasons),
        'readAt': readAt?.toIso8601String(),
        'createdAt': createdAt.toIso8601String(),
      };

  AppNotification copyWith({DateTime? readAt, bool clearReadAt = false}) => AppNotification(
        id: id,
        deviceId: deviceId,
        type: type,
        title: title,
        body: body,
        reasons: reasons,
        readAt: clearReadAt ? null : (readAt ?? this.readAt),
        createdAt: createdAt,
      );
}

class NotificationListResponse {
  const NotificationListResponse({
    required this.items,
    required this.nextCursor,
    required this.unreadCount,
  });

  final List<AppNotification> items;
  final String? nextCursor;
  final int unreadCount;

  factory NotificationListResponse.fromJson(Map<String, dynamic> json) => NotificationListResponse(
        items: (json['items'] as List<dynamic>)
            .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
            .toList(),
        nextCursor: json['nextCursor'] as String?,
        unreadCount: json['unreadCount'] as int,
      );
}

class NotificationPreferences {
  const NotificationPreferences({
    required this.inApp,
    required this.push,
    required this.telegram,
    required this.telegramLinked,
  });

  final bool inApp;
  final bool push;
  final bool telegram;
  final bool telegramLinked;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) => NotificationPreferences(
        inApp: json['inApp'] as bool,
        push: json['push'] as bool,
        telegram: json['telegram'] as bool,
        telegramLinked: json['telegramLinked'] as bool,
      );

  NotificationPreferences copyWith({bool? inApp, bool? push, bool? telegram}) =>
      NotificationPreferences(
        inApp: inApp ?? this.inApp,
        push: push ?? this.push,
        telegram: telegram ?? this.telegram,
        telegramLinked: telegramLinked,
      );
}

class UpdateNotificationPreferencesRequest {
  const UpdateNotificationPreferencesRequest({this.inApp, this.push, this.telegram});

  final bool? inApp;
  final bool? push;
  final bool? telegram;

  Map<String, dynamic> toJson() => {
        if (inApp != null) 'inApp': inApp,
        if (push != null) 'push': push,
        if (telegram != null) 'telegram': telegram,
      };
}

class RegisterPushTokenRequest {
  const RegisterPushTokenRequest({required this.fcmToken, required this.platform});

  final String fcmToken;
  final String platform; // 'android' | 'ios'

  Map<String, dynamic> toJson() => {
        'fcmToken': fcmToken,
        'platform': platform,
      };
}
