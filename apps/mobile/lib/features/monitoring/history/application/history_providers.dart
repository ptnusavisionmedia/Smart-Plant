import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers.dart';
import '../../../../shared/models/device_models.dart';
import '../data/readings_repository.dart';

final readingsRepositoryProvider = Provider<ReadingsRepository>((ref) {
  return ReadingsRepository(apiClient: ref.watch(apiClientProvider));
});

/// Range selector segments (DESIGN.md "Segmented control"): 24 jam / 7
/// hari / 30 hari, each mapped to the interval bucket Tech Spec §4.8
/// allows for that span (`raw` <=24h, `hour` <=90d, `day` <=2y).
enum HistoryRange {
  day24,
  day7,
  day30;

  String get label {
    switch (this) {
      case HistoryRange.day24:
        return '24 jam';
      case HistoryRange.day7:
        return '7 hari';
      case HistoryRange.day30:
        return '30 hari';
    }
  }

  ReadingsInterval get interval {
    switch (this) {
      case HistoryRange.day24:
        return ReadingsInterval.raw;
      case HistoryRange.day7:
      case HistoryRange.day30:
        return ReadingsInterval.hour;
    }
  }

  Duration get span {
    switch (this) {
      case HistoryRange.day24:
        return const Duration(hours: 24);
      case HistoryRange.day7:
        return const Duration(days: 7);
      case HistoryRange.day30:
        return const Duration(days: 30);
    }
  }
}

final historyRangeProvider = StateProvider.autoDispose<HistoryRange>((ref) => HistoryRange.day24);

final historyReadingsProvider =
    FutureProvider.autoDispose.family<ReadingsResponse, String>((ref, deviceId) async {
  final range = ref.watch(historyRangeProvider);
  final now = DateTime.now().toUtc();
  final query = ReadingsQuery(from: now.subtract(range.span), to: now, interval: range.interval);
  return ref.watch(readingsRepositoryProvider).getReadings(deviceId, query);
});

/// Downsamples to at most [maxPoints] (DESIGN.md: "Downsample to at most
/// 120 points") by averaging buckets of consecutive points, so a chart
/// never has to render a dense raw series directly.
List<ReadingsPoint> downsample(List<ReadingsPoint> points, {int maxPoints = 120}) {
  if (points.length <= maxPoints) return points;
  final bucketSize = (points.length / maxPoints).ceil();
  final result = <ReadingsPoint>[];
  for (var i = 0; i < points.length; i += bucketSize) {
    final bucket = points.skip(i).take(bucketSize).toList();
    result.add(_averageBucket(bucket));
  }
  return result;
}

ReadingsPoint _averageBucket(List<ReadingsPoint> bucket) {
  double? avg(Iterable<double?> values) {
    final nonNull = values.whereType<double>().toList();
    if (nonNull.isEmpty) return null;
    return nonNull.reduce((a, b) => a + b) / nonNull.length;
  }

  return ReadingsPoint(
    bucket: bucket[bucket.length ~/ 2].bucket,
    soilMoisture: avg(bucket.map((p) => p.soilMoisture)),
    temperature: avg(bucket.map((p) => p.temperature)),
    humidity: avg(bucket.map((p) => p.humidity)),
    waterLevel: avg(bucket.map((p) => p.waterLevel)),
  );
}

/// Text summary above the chart (DESIGN.md example: "Kelembapan tanah
/// turun 18% dalam 24 jam"), comparing the first and last non-null soil
/// moisture point in range.
String? buildSoilSummary(List<ReadingsPoint> points, HistoryRange range) {
  final withSoil = points.where((p) => p.soilMoisture != null).toList();
  if (withSoil.length < 2) return null;
  final first = withSoil.first.soilMoisture!;
  final last = withSoil.last.soilMoisture!;
  final delta = last - first;
  final direction = delta < 0 ? 'turun' : 'naik';
  return 'Kelembapan tanah $direction ${delta.abs().round()}% dalam ${range.label}';
}
