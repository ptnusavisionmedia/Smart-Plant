/// Mirrors `packages/shared/src/schemas/status.ts`.
///
/// Priority order (highest first): CRITICAL > WATER_LOW > WARNING > NORMAL.
enum DeviceStatus {
  normal,
  warning,
  critical,
  waterLow;

  static DeviceStatus fromJson(String value) {
    switch (value) {
      case 'NORMAL':
        return DeviceStatus.normal;
      case 'WARNING':
        return DeviceStatus.warning;
      case 'CRITICAL':
        return DeviceStatus.critical;
      case 'WATER_LOW':
        return DeviceStatus.waterLow;
      default:
        throw FormatException('Unknown DeviceStatus: $value');
    }
  }

  String toJson() {
    switch (this) {
      case DeviceStatus.normal:
        return 'NORMAL';
      case DeviceStatus.warning:
        return 'WARNING';
      case DeviceStatus.critical:
        return 'CRITICAL';
      case DeviceStatus.waterLow:
        return 'WATER_LOW';
    }
  }
}

/// Mirrors `StatusReasonSchema` in `packages/shared/src/schemas/status.ts`.
enum StatusReason {
  soilCriticalDry,
  soilCriticalWet,
  soilWarningDry,
  soilWarningWet,
  tempCriticalLow,
  tempCriticalHigh,
  tempWarningLow,
  tempWarningHigh,
  humidityCriticalLow,
  humidityCriticalHigh,
  humidityWarningLow,
  humidityWarningHigh,
  waterLow,
  sensorError;

  static const Map<String, StatusReason> _byJson = {
    'SOIL_CRITICAL_DRY': StatusReason.soilCriticalDry,
    'SOIL_CRITICAL_WET': StatusReason.soilCriticalWet,
    'SOIL_WARNING_DRY': StatusReason.soilWarningDry,
    'SOIL_WARNING_WET': StatusReason.soilWarningWet,
    'TEMP_CRITICAL_LOW': StatusReason.tempCriticalLow,
    'TEMP_CRITICAL_HIGH': StatusReason.tempCriticalHigh,
    'TEMP_WARNING_LOW': StatusReason.tempWarningLow,
    'TEMP_WARNING_HIGH': StatusReason.tempWarningHigh,
    'HUMIDITY_CRITICAL_LOW': StatusReason.humidityCriticalLow,
    'HUMIDITY_CRITICAL_HIGH': StatusReason.humidityCriticalHigh,
    'HUMIDITY_WARNING_LOW': StatusReason.humidityWarningLow,
    'HUMIDITY_WARNING_HIGH': StatusReason.humidityWarningHigh,
    'WATER_LOW': StatusReason.waterLow,
    'SENSOR_ERROR': StatusReason.sensorError,
  };

  static StatusReason fromJson(String value) {
    final match = _byJson[value];
    if (match == null) throw FormatException('Unknown StatusReason: $value');
    return match;
  }

  String toJson() {
    return _byJson.entries.firstWhere((e) => e.value == this).key;
  }

  /// Short Indonesian label for display in notification rows and timelines.
  String get label {
    switch (this) {
      case StatusReason.soilCriticalDry:
        return 'Tanah sangat kering';
      case StatusReason.soilCriticalWet:
        return 'Tanah sangat basah';
      case StatusReason.soilWarningDry:
        return 'Tanah mulai kering';
      case StatusReason.soilWarningWet:
        return 'Tanah terlalu basah';
      case StatusReason.tempCriticalLow:
        return 'Suhu sangat rendah';
      case StatusReason.tempCriticalHigh:
        return 'Suhu sangat tinggi';
      case StatusReason.tempWarningLow:
        return 'Suhu rendah';
      case StatusReason.tempWarningHigh:
        return 'Suhu tinggi';
      case StatusReason.humidityCriticalLow:
        return 'Kelembapan udara sangat rendah';
      case StatusReason.humidityCriticalHigh:
        return 'Kelembapan udara sangat tinggi';
      case StatusReason.humidityWarningLow:
        return 'Kelembapan udara rendah';
      case StatusReason.humidityWarningHigh:
        return 'Kelembapan udara tinggi';
      case StatusReason.waterLow:
        return 'Air tangki rendah';
      case StatusReason.sensorError:
        return 'Sensor bermasalah';
    }
  }
}

List<StatusReason> statusReasonListFromJson(List<dynamic>? json) {
  if (json == null) return const [];
  return json.map((e) => StatusReason.fromJson(e as String)).toList();
}

List<String> statusReasonListToJson(List<StatusReason> reasons) {
  return reasons.map((r) => r.toJson()).toList();
}
