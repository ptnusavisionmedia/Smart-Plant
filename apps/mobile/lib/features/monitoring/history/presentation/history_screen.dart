import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_tokens.dart';
import '../../../../shared/models/device_models.dart';
import '../../../../shared/widgets/app_state_views.dart';
import '../application/history_providers.dart';

/// `/devices/:id/history` — DESIGN.md "Chart panel": downsampled line
/// chart, range selector, text summary above the chart, empty/error
/// states, 2px lines in chart tokens, no gradients/3D/dual axes.
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key, required this.deviceId});

  final String deviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final range = ref.watch(historyRangeProvider);
    final readingsAsync = ref.watch(historyReadingsProvider(deviceId));

    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat')),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(tokens.spacingLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RangeSelector(
                selected: range,
                onSelect: (value) => ref.read(historyRangeProvider.notifier).state = value,
              ),
              SizedBox(height: tokens.spacingLg),
              Expanded(
                child: readingsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => ErrorStateView(
                    message: 'Gagal memuat riwayat. Periksa koneksi Anda.',
                    onRetry: () => ref.invalidate(historyReadingsProvider(deviceId)),
                  ),
                  data: (response) {
                    final points = downsample(response.points);
                    if (points.isEmpty) {
                      return const EmptyStateView(
                        icon: Icons.show_chart,
                        title: 'Belum ada data',
                        body: 'Belum ada pembacaan sensor pada rentang waktu ini.',
                      );
                    }
                    final summary = buildSoilSummary(points, range);
                    return ListView(
                      children: [
                        if (summary != null) ...[
                          Text(summary, style: tokens.labelStyle.copyWith(fontSize: 16)),
                          SizedBox(height: tokens.spacingLg),
                        ],
                        _ChartLegend(tokens: tokens),
                        SizedBox(height: tokens.spacingMd),
                        SizedBox(
                          height: 240,
                          child: _HistoryChart(points: points, tokens: tokens),
                        ),
                        SizedBox(height: tokens.spacingXl),
                        _ReadingsTable(points: points, tokens: tokens),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RangeSelector extends StatelessWidget {
  const _RangeSelector({required this.selected, required this.onSelect});

  final HistoryRange selected;
  final ValueChanged<HistoryRange> onSelect;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      height: 32,
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: tokens.backgroundLayer1,
        borderRadius: BorderRadius.circular(tokens.radiusFull),
      ),
      child: Row(
        children: HistoryRange.values.map((range) {
          final isSelected = range == selected;
          return Expanded(
            child: GestureDetector(
              key: Key('history_range_${range.name}'),
              onTap: () => onSelect(range),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? tokens.backgroundBase : Colors.transparent,
                  borderRadius: BorderRadius.circular(tokens.radiusFull),
                  border: isSelected ? Border.all(color: tokens.borderSubtle) : null,
                ),
                child: Text(
                  range.label,
                  style: tokens.labelStyle.copyWith(
                    fontSize: 14,
                    color: isSelected ? tokens.neutralContent : tokens.neutralSubdued,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ChartLegend extends StatelessWidget {
  const _ChartLegend({required this.tokens});
  final AppTokens tokens;

  @override
  Widget build(BuildContext context) {
    final entries = [
      ('Kelembapan tanah', tokens.chartSoil),
      ('Suhu', tokens.chartTemperature),
      ('Kelembapan udara', tokens.chartHumidity),
      ('Air', tokens.chartWater),
    ];
    return Wrap(
      spacing: 12,
      runSpacing: 4,
      children: entries.map((e) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: e.$2, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text(e.$1, style: tokens.detailStyle),
          ],
        );
      }).toList(),
    );
  }
}

class _HistoryChart extends StatelessWidget {
  const _HistoryChart({required this.points, required this.tokens});

  final List<ReadingsPoint> points;
  final AppTokens tokens;

  List<FlSpot> _spots(double? Function(ReadingsPoint) selector) {
    final spots = <FlSpot>[];
    for (var i = 0; i < points.length; i++) {
      final value = selector(points[i]);
      if (value != null) spots.add(FlSpot(i.toDouble(), value));
    }
    return spots;
  }

  @override
  Widget build(BuildContext context) {
    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          getDrawingHorizontalLine: (_) => FlLine(color: tokens.borderSubtle, strokeWidth: 1),
          drawVerticalLine: false,
        ),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineTouchData: const LineTouchData(enabled: true),
        lineBarsData: [
          _line(_spots((p) => p.soilMoisture), tokens.chartSoil),
          _line(_spots((p) => p.temperature), tokens.chartTemperature),
          _line(_spots((p) => p.humidity), tokens.chartHumidity),
          _line(_spots((p) => p.waterLevel), tokens.chartWater),
        ],
      ),
    );
  }

  LineChartBarData _line(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: false,
      color: color,
      barWidth: 2,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(show: false),
    );
  }
}

/// Table alternative for the same data (DESIGN.md: "Provide a table
/// alternative"), so series aren't distinguished by color alone.
class _ReadingsTable extends StatelessWidget {
  const _ReadingsTable({required this.points, required this.tokens});

  final List<ReadingsPoint> points;
  final AppTokens tokens;

  @override
  Widget build(BuildContext context) {
    final rows = points.length > 20 ? points.sublist(points.length - 20) : points;
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(1.4),
        1: FlexColumnWidth(1),
        2: FlexColumnWidth(1),
        3: FlexColumnWidth(1),
        4: FlexColumnWidth(1),
      },
      border: TableBorder(
        horizontalInside: BorderSide(color: tokens.borderSubtle),
      ),
      children: [
        TableRow(children: [
          _cell('Waktu', tokens, header: true),
          _cell('Tanah %', tokens, header: true),
          _cell('Suhu °C', tokens, header: true),
          _cell('Udara %', tokens, header: true),
          _cell('Air %', tokens, header: true),
        ]),
        for (final point in rows)
          TableRow(children: [
            _cell(_formatTime(point.bucket), tokens),
            _cell(_fmt(point.soilMoisture), tokens),
            _cell(_fmt(point.temperature), tokens),
            _cell(_fmt(point.humidity), tokens),
            _cell(_fmt(point.waterLevel), tokens),
          ]),
      ],
    );
  }

  String _fmt(double? v) => v == null ? '—' : v.toStringAsFixed(1);
  String _formatTime(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Widget _cell(String text, AppTokens tokens, {bool header = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        text,
        style: header
            ? tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)
            : tokens.dataSm,
        textAlign: TextAlign.right,
      ),
    );
  }
}
