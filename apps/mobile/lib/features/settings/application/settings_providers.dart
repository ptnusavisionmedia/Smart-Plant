import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../shared/models/plant_profile_models.dart';
import '../data/plant_profile_repository.dart';

final plantProfileRepositoryProvider = Provider<PlantProfileRepository>((ref) {
  return PlantProfileRepository(apiClient: ref.watch(apiClientProvider));
});

final plantProfilesProvider = FutureProvider.autoDispose<List<PlantProfile>>((ref) {
  return ref.watch(plantProfileRepositoryProvider).list();
});
