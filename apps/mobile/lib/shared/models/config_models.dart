/// Mirrors `packages/shared/src/schemas/config.ts`.
library;

/// Validation error for a threshold form, keyed by field path so the UI can
/// show the message next to the right input (mirrors the Zod `.refine`
/// `path` used on the backend).
class ThresholdValidationError {
  const ThresholdValidationError(this.path, this.message);
  final String path;
  final String message;
}

class RangeThreshold {
  const RangeThreshold({
    required this.criticalLow,
    required this.warningLow,
    required this.warningHigh,
    required this.criticalHigh,
  });

  final double criticalLow;
  final double warningLow;
  final double warningHigh;
  final double criticalHigh;

  factory RangeThreshold.fromJson(Map<String, dynamic> json) => RangeThreshold(
        criticalLow: (json['criticalLow'] as num).toDouble(),
        warningLow: (json['warningLow'] as num).toDouble(),
        warningHigh: (json['warningHigh'] as num).toDouble(),
        criticalHigh: (json['criticalHigh'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'criticalLow': criticalLow,
        'warningLow': warningLow,
        'warningHigh': warningHigh,
        'criticalHigh': criticalHigh,
      };

  RangeThreshold copyWith({
    double? criticalLow,
    double? warningLow,
    double? warningHigh,
    double? criticalHigh,
  }) => RangeThreshold(
        criticalLow: criticalLow ?? this.criticalLow,
        warningLow: warningLow ?? this.warningLow,
        warningHigh: warningHigh ?? this.warningHigh,
        criticalHigh: criticalHigh ?? this.criticalHigh,
      );

  /// Mirrors the three `.refine()` checks on `RangeThresholdSchema`.
  List<ThresholdValidationError> validate(String prefix) {
    final errors = <ThresholdValidationError>[];
    if (!(criticalLow < warningLow)) {
      errors.add(ThresholdValidationError(
        '$prefix.criticalLow',
        'criticalLow harus lebih rendah dari warningLow',
      ));
    }
    if (!(warningLow < warningHigh)) {
      errors.add(ThresholdValidationError(
        '$prefix.warningLow',
        'warningLow harus lebih rendah dari warningHigh',
      ));
    }
    if (!(warningHigh < criticalHigh)) {
      errors.add(ThresholdValidationError(
        '$prefix.warningHigh',
        'warningHigh harus lebih rendah dari criticalHigh',
      ));
    }
    return errors;
  }
}

class WaterThreshold {
  const WaterThreshold({required this.warningLow, required this.criticalLow});

  final double warningLow;
  final double criticalLow;

  factory WaterThreshold.fromJson(Map<String, dynamic> json) => WaterThreshold(
        warningLow: (json['warningLow'] as num).toDouble(),
        criticalLow: (json['criticalLow'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'warningLow': warningLow,
        'criticalLow': criticalLow,
      };

  WaterThreshold copyWith({double? warningLow, double? criticalLow}) => WaterThreshold(
        warningLow: warningLow ?? this.warningLow,
        criticalLow: criticalLow ?? this.criticalLow,
      );

  /// Mirrors `WaterThresholdSchema`'s `.refine()`: criticalLow (WATER_LOW)
  /// must be lower than warningLow.
  List<ThresholdValidationError> validate(String prefix) {
    if (!(criticalLow < warningLow)) {
      return [
        ThresholdValidationError(
          '$prefix.criticalLow',
          'criticalLow (WATER_LOW) harus lebih rendah dari warningLow',
        ),
      ];
    }
    return const [];
  }
}

class Thresholds {
  const Thresholds({
    required this.soil,
    required this.temp,
    required this.humidity,
    required this.water,
  });

  final RangeThreshold soil;
  final RangeThreshold temp;
  final RangeThreshold humidity;
  final WaterThreshold water;

  factory Thresholds.fromJson(Map<String, dynamic> json) => Thresholds(
        soil: RangeThreshold.fromJson(json['soil'] as Map<String, dynamic>),
        temp: RangeThreshold.fromJson(json['temp'] as Map<String, dynamic>),
        humidity: RangeThreshold.fromJson(json['humidity'] as Map<String, dynamic>),
        water: WaterThreshold.fromJson(json['water'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        'soil': soil.toJson(),
        'temp': temp.toJson(),
        'humidity': humidity.toJson(),
        'water': water.toJson(),
      };

  Thresholds copyWith({
    RangeThreshold? soil,
    RangeThreshold? temp,
    RangeThreshold? humidity,
    WaterThreshold? water,
  }) => Thresholds(
        soil: soil ?? this.soil,
        temp: temp ?? this.temp,
        humidity: humidity ?? this.humidity,
        water: water ?? this.water,
      );

  List<ThresholdValidationError> validate() => [
        ...soil.validate('thresholds.soil'),
        ...temp.validate('thresholds.temp'),
        ...humidity.validate('thresholds.humidity'),
        ...water.validate('thresholds.water'),
      ];
}

enum WaterLevelSource {
  ultrasonic,
  floatSwitch;

  static WaterLevelSource fromJson(String value) {
    switch (value) {
      case 'ultrasonic':
        return WaterLevelSource.ultrasonic;
      case 'float_switch':
        return WaterLevelSource.floatSwitch;
      default:
        throw FormatException('Unknown WaterLevelSource: $value');
    }
  }

  String toJson() => this == WaterLevelSource.ultrasonic ? 'ultrasonic' : 'float_switch';
}

class DeviceConfig {
  const DeviceConfig({
    required this.deviceId,
    required this.thresholds,
    required this.targetMoisture,
    required this.maxPumpSeconds,
    required this.cooldownSeconds,
    required this.telemetryIntervalSeconds,
    required this.waterLevelSource,
    required this.tankHeightCm,
    required this.tankMaxLevelCm,
    required this.configVersion,
  });

  final String deviceId;
  final Thresholds thresholds;
  final double targetMoisture;
  final int maxPumpSeconds;
  final int cooldownSeconds;
  final int telemetryIntervalSeconds;
  final WaterLevelSource waterLevelSource;
  final double tankHeightCm;
  final double tankMaxLevelCm;
  final int configVersion;

  factory DeviceConfig.fromJson(Map<String, dynamic> json) => DeviceConfig(
        deviceId: json['deviceId'] as String,
        thresholds: Thresholds.fromJson(json['thresholds'] as Map<String, dynamic>),
        targetMoisture: (json['targetMoisture'] as num).toDouble(),
        maxPumpSeconds: json['maxPumpSeconds'] as int,
        cooldownSeconds: json['cooldownSeconds'] as int,
        telemetryIntervalSeconds: json['telemetryIntervalSeconds'] as int,
        waterLevelSource: WaterLevelSource.fromJson(json['waterLevelSource'] as String),
        tankHeightCm: (json['tankHeightCm'] as num).toDouble(),
        tankMaxLevelCm: (json['tankMaxLevelCm'] as num).toDouble(),
        configVersion: json['configVersion'] as int,
      );

  Map<String, dynamic> toJson() => {
        'deviceId': deviceId,
        'thresholds': thresholds.toJson(),
        'targetMoisture': targetMoisture,
        'maxPumpSeconds': maxPumpSeconds,
        'cooldownSeconds': cooldownSeconds,
        'telemetryIntervalSeconds': telemetryIntervalSeconds,
        'waterLevelSource': waterLevelSource.toJson(),
        'tankHeightCm': tankHeightCm,
        'tankMaxLevelCm': tankMaxLevelCm,
        'configVersion': configVersion,
      };

  /// Mirrors `DeviceConfigSchema`'s `.refine()`: targetMoisture must be
  /// above `thresholds.soil.warningLow`.
  List<ThresholdValidationError> validate() => [
        ...thresholds.validate(),
        if (!(targetMoisture > thresholds.soil.warningLow))
          const ThresholdValidationError(
            'targetMoisture',
            'targetMoisture harus di atas thresholds.soil.warningLow',
          ),
      ];
}

class UpdateDeviceConfigRequest {
  const UpdateDeviceConfigRequest({
    this.thresholds,
    this.targetMoisture,
    this.maxPumpSeconds,
    this.cooldownSeconds,
    this.telemetryIntervalSeconds,
    this.waterLevelSource,
    this.tankHeightCm,
    this.tankMaxLevelCm,
  });

  final Thresholds? thresholds;
  final double? targetMoisture;
  final int? maxPumpSeconds;
  final int? cooldownSeconds;
  final int? telemetryIntervalSeconds;
  final WaterLevelSource? waterLevelSource;
  final double? tankHeightCm;
  final double? tankMaxLevelCm;

  Map<String, dynamic> toJson() => {
        if (thresholds != null) 'thresholds': thresholds!.toJson(),
        if (targetMoisture != null) 'targetMoisture': targetMoisture,
        if (maxPumpSeconds != null) 'maxPumpSeconds': maxPumpSeconds,
        if (cooldownSeconds != null) 'cooldownSeconds': cooldownSeconds,
        if (telemetryIntervalSeconds != null)
          'telemetryIntervalSeconds': telemetryIntervalSeconds,
        if (waterLevelSource != null) 'waterLevelSource': waterLevelSource!.toJson(),
        if (tankHeightCm != null) 'tankHeightCm': tankHeightCm,
        if (tankMaxLevelCm != null) 'tankMaxLevelCm': tankMaxLevelCm,
      };
}
