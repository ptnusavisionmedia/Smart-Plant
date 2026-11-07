/// Mirrors `packages/shared/src/schemas/device.ts`.
library;

import 'status.dart';

class ClaimDeviceRequest {
  const ClaimDeviceRequest({
    required this.claimCode,
    required this.name,
    this.location,
    this.plantProfileId,
  });

  final String claimCode;
  final String name;
  final String? location;
  final String? plantProfileId;

  Map<String, dynamic> toJson() => {
        'claimCode': claimCode,
        'name': name,
        if (location != null) 'location': location,
        if (plantProfileId != null) 'plantProfileId': plantProfileId,
      };
}

class UpdateDeviceRequest {
  const UpdateDeviceRequest({this.name, this.location, this.plantProfileId});

  final String? name;
  final String? location;
  final String? plantProfileId;

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (location != null) 'location': location,
        if (plantProfileId != null) 'plantProfileId': plantProfileId,
      };
}

/// The `latest` snapshot embedded in [DeviceSummary]. Fields are nullable
/// because a failed sensor read is reported as `null`, never a fabricated
/// zero (see DESIGN.md's tank level and SENSOR_ERROR rules).
class LatestReadingSnapshot {
  const LatestReadingSnapshot({
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

  factory LatestReadingSnapshot.fromJson(Map<String, dynamic> json) => LatestReadingSnapshot(
        soilMoisture: (json['soilMoisture'] as num?)?.toDouble(),
        temperature: (json['temperature'] as num?)?.toDouble(),
        humidity: (json['humidity'] as num?)?.toDouble(),
        waterLevel: (json['waterLevel'] as num?)?.toDouble(),
        pumpOn: json['pumpOn'] as bool,
        ts: DateTime.parse(json['ts'] as String),
      );

  Map<String, dynamic> toJson() => {
        'soilMoisture': soilMoisture,
        'temperature': temperature,
        'humidity': humidity,
        'waterLevel': waterLevel,
        'pumpOn': pumpOn,
        'ts': ts.toIso8601String(),
      };

  LatestReadingSnapshot copyWith({
    double? soilMoisture,
    bool soilMoistureIsNull = false,
    double? temperature,
    bool temperatureIsNull = false,
    double? humidity,
    bool humidityIsNull = false,
    double? waterLevel,
    bool waterLevelIsNull = false,
    bool? pumpOn,
    DateTime? ts,
  }) => LatestReadingSnapshot(
        soilMoisture: soilMoistureIsNull ? null : (soilMoisture ?? this.soilMoisture),
        temperature: temperatureIsNull ? null : (temperature ?? this.temperature),
        humidity: humidityIsNull ? null : (humidity ?? this.humidity),
        waterLevel: waterLevelIsNull ? null : (waterLevel ?? this.waterLevel),
        pumpOn: pumpOn ?? this.pumpOn,
        ts: ts ?? this.ts,
      );
}

class DeviceSummary {
  const DeviceSummary({
    required this.id,
    required this.deviceUid,
    required this.name,
    required this.location,
    required this.status,
    required this.reasons,
    required this.isOnline,
    required this.lastSeenAt,
    required this.autoMode,
    required this.emergencyLatched,
    required this.latest,
  });

  final String id;
  final String deviceUid;
  final String name;
  final String? location;
  final DeviceStatus status;
  final List<StatusReason> reasons;
  final bool isOnline;
  final DateTime? lastSeenAt;
  final bool autoMode;
  final bool emergencyLatched;
  final LatestReadingSnapshot? latest;

  factory DeviceSummary.fromJson(Map<String, dynamic> json) => DeviceSummary(
        id: json['id'] as String,
        deviceUid: json['deviceUid'] as String,
        name: json['name'] as String,
        location: json['location'] as String?,
        status: DeviceStatus.fromJson(json['status'] as String),
        reasons: statusReasonListFromJson(json['reasons'] as List<dynamic>?),
        isOnline: json['isOnline'] as bool,
        lastSeenAt: json['lastSeenAt'] == null
            ? null
            : DateTime.parse(json['lastSeenAt'] as String),
        autoMode: json['autoMode'] as bool,
        emergencyLatched: json['emergencyLatched'] as bool,
        latest: json['latest'] == null
            ? null
            : LatestReadingSnapshot.fromJson(json['latest'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'deviceUid': deviceUid,
        'name': name,
        'location': location,
        'status': status.toJson(),
        'reasons': statusReasonListToJson(reasons),
        'isOnline': isOnline,
        'lastSeenAt': lastSeenAt?.toIso8601String(),
        'autoMode': autoMode,
        'emergencyLatched': emergencyLatched,
        'latest': latest?.toJson(),
      };

  DeviceSummary copyWith({
    String? name,
    String? location,
    DeviceStatus? status,
    List<StatusReason>? reasons,
    bool? isOnline,
    DateTime? lastSeenAt,
    bool? autoMode,
    bool? emergencyLatched,
    LatestReadingSnapshot? latest,
  }) => DeviceSummary(
        id: id,
        deviceUid: deviceUid,
        name: name ?? this.name,
        location: location ?? this.location,
        status: status ?? this.status,
        reasons: reasons ?? this.reasons,
        isOnline: isOnline ?? this.isOnline,
        lastSeenAt: lastSeenAt ?? this.lastSeenAt,
        autoMode: autoMode ?? this.autoMode,
        emergencyLatched: emergencyLatched ?? this.emergencyLatched,
        latest: latest ?? this.latest,
      );
}

class ManualWateringRequest {
  const ManualWateringRequest({this.durationSeconds = 10});

  final int durationSeconds;

  Map<String, dynamic> toJson() => {'durationSeconds': durationSeconds};
}

enum WateringState {
  pending,
  running,
  completed,
  stopped,
  rejected,
  timeout;

  static WateringState fromJson(String value) {
    return WateringState.values.firstWhere(
      (v) => v.name == value,
      orElse: () => throw FormatException('Unknown WateringState: $value'),
    );
  }

  String toJson() => name;
}

class ManualWateringResponse {
  const ManualWateringResponse({required this.commandId, required this.accepted, required this.state});

  final String commandId;
  final bool accepted;
  final WateringState state;

  factory ManualWateringResponse.fromJson(Map<String, dynamic> json) => ManualWateringResponse(
        commandId: json['commandId'] as String,
        accepted: json['accepted'] as bool,
        state: WateringState.fromJson(json['state'] as String),
      );
}

enum ReadingsInterval {
  raw,
  hour,
  day;

  static ReadingsInterval fromJson(String value) =>
      ReadingsInterval.values.firstWhere((v) => v.name == value);

  String toJson() => name;
}

class ReadingsQuery {
  const ReadingsQuery({this.from, this.to, this.interval = ReadingsInterval.raw});

  final DateTime? from;
  final DateTime? to;
  final ReadingsInterval interval;

  Map<String, String> toQueryParameters() => {
        if (from != null) 'from': from!.toUtc().toIso8601String(),
        if (to != null) 'to': to!.toUtc().toIso8601String(),
        'interval': interval.toJson(),
      };
}

class ReadingsPoint {
  const ReadingsPoint({
    required this.bucket,
    required this.soilMoisture,
    required this.temperature,
    required this.humidity,
    required this.waterLevel,
  });

  final DateTime bucket;
  final double? soilMoisture;
  final double? temperature;
  final double? humidity;
  final double? waterLevel;

  factory ReadingsPoint.fromJson(Map<String, dynamic> json) => ReadingsPoint(
        bucket: DateTime.parse(json['bucket'] as String),
        soilMoisture: (json['soilMoisture'] as num?)?.toDouble(),
        temperature: (json['temperature'] as num?)?.toDouble(),
        humidity: (json['humidity'] as num?)?.toDouble(),
        waterLevel: (json['waterLevel'] as num?)?.toDouble(),
      );
}

class ReadingsResponse {
  const ReadingsResponse({required this.interval, required this.points});

  final ReadingsInterval interval;
  final List<ReadingsPoint> points;

  factory ReadingsResponse.fromJson(Map<String, dynamic> json) => ReadingsResponse(
        interval: ReadingsInterval.fromJson(json['interval'] as String),
        points: (json['points'] as List<dynamic>)
            .map((e) => ReadingsPoint.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
