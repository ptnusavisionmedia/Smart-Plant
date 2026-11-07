/// Mirrors `packages/shared/src/schemas/plant-profile.ts`.
library;

import 'config_models.dart';

class PlantProfile {
  const PlantProfile({
    required this.id,
    required this.name,
    required this.isSystem,
    required this.ownerUserId,
    required this.thresholds,
  });

  final String id;
  final String name;
  final bool isSystem;
  final String? ownerUserId;
  final Thresholds thresholds;

  factory PlantProfile.fromJson(Map<String, dynamic> json) => PlantProfile(
        id: json['id'] as String,
        name: json['name'] as String,
        isSystem: json['isSystem'] as bool,
        ownerUserId: json['ownerUserId'] as String?,
        thresholds: Thresholds.fromJson(json['thresholds'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'isSystem': isSystem,
        'ownerUserId': ownerUserId,
        'thresholds': thresholds.toJson(),
      };
}

class CreatePlantProfileRequest {
  const CreatePlantProfileRequest({required this.name, required this.thresholds});

  final String name;
  final Thresholds thresholds;

  Map<String, dynamic> toJson() => {
        'name': name,
        'thresholds': thresholds.toJson(),
      };
}

class UpdatePlantProfileRequest {
  const UpdatePlantProfileRequest({this.name, this.thresholds});

  final String? name;
  final Thresholds? thresholds;

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (thresholds != null) 'thresholds': thresholds!.toJson(),
      };
}
