import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_tokens.dart';
import '../../../../shared/models/config_models.dart';
import '../../../../shared/widgets/app_state_views.dart';
import '../../../devices/application/device_providers.dart';
import '../../application/settings_providers.dart';
import '../application/config_providers.dart';

/// DESIGN.md "Threshold and settings form": thresholds grouped by sensor
/// (Kelembapan tanah, Suhu, Kelembapan udara, Level air), inline
/// validation mirroring the Zod `.refine()` rules in `config.ts`
/// (`criticalLow < warningLow < warningHigh < criticalHigh`, and
/// `targetMoisture > thresholds.soil.warningLow`), plus an unsaved-changes
/// label rather than a colored dot alone.
class ThresholdConfigScreen extends ConsumerStatefulWidget {
  const ThresholdConfigScreen({super.key, required this.deviceId});

  final String deviceId;

  @override
  ConsumerState<ThresholdConfigScreen> createState() => _ThresholdConfigScreenState();
}

class _ThresholdConfigScreenState extends ConsumerState<ThresholdConfigScreen> {
  Thresholds? _thresholds;
  double? _targetMoisture;
  int? _maxPumpSeconds;
  bool _dirty = false;
  List<ThresholdValidationError> _errors = const [];

  void _seed(DeviceConfig config) {
    _thresholds ??= config.thresholds;
    _targetMoisture ??= config.targetMoisture;
    _maxPumpSeconds ??= config.maxPumpSeconds;
  }

  void _markDirty() => setState(() => _dirty = true);

  String? _fieldError(String path) {
    for (final e in _errors) {
      if (e.path == path) return e.message;
    }
    return null;
  }

  Future<void> _save() async {
    final thresholds = _thresholds;
    final targetMoisture = _targetMoisture;
    final maxPumpSeconds = _maxPumpSeconds;
    if (thresholds == null || targetMoisture == null || maxPumpSeconds == null) return;

    final draft = DeviceConfig(
      deviceId: widget.deviceId,
      thresholds: thresholds,
      targetMoisture: targetMoisture,
      maxPumpSeconds: maxPumpSeconds,
      cooldownSeconds: 0,
      telemetryIntervalSeconds: 30,
      waterLevelSource: WaterLevelSource.ultrasonic,
      tankHeightCm: 1,
      tankMaxLevelCm: 1,
      configVersion: 1,
    );
    final errors = draft.validate();
    setState(() => _errors = errors);
    if (errors.isNotEmpty) return;

    final ok = await ref.read(configSaveControllerProvider.notifier).save(
          widget.deviceId,
          UpdateDeviceConfigRequest(thresholds: thresholds, targetMoisture: targetMoisture),
        );
    if (!mounted) return;
    if (ok) setState(() => _dirty = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? 'Pengaturan disimpan' : 'Gagal menyimpan pengaturan')),
    );
  }

  /// "List/apply plant profiles" (T-48): picking a system or custom
  /// profile here prefills the threshold fields from it; nothing is sent
  /// to the server until "Simpan" is tapped.
  Future<void> _pickProfile(BuildContext context) async {
    final profiles = await ref.read(plantProfilesProvider.future);
    if (!context.mounted) return;
    final selected = await showModalBottomSheet<Thresholds>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final profile in profiles)
              ListTile(
                title: Text(profile.name),
                subtitle: profile.isSystem ? const Text('Profil sistem') : null,
                onTap: () => Navigator.pop(sheetContext, profile.thresholds),
              ),
          ],
        ),
      ),
    );
    if (selected != null) {
      setState(() {
        _thresholds = selected;
        _dirty = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final configAsync = ref.watch(deviceConfigProvider(widget.deviceId));
    final saveState = ref.watch(configSaveControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ambang Batas'),
        actions: [
          TextButton(
            onPressed: () => _pickProfile(context),
            child: const Text('Terapkan profil'),
          ),
        ],
      ),
      body: SafeArea(
        child: configAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorStateView(
            message: 'Gagal memuat pengaturan.',
            onRetry: () => ref.invalidate(deviceConfigProvider(widget.deviceId)),
          ),
          data: (config) {
            _seed(config);
            final thresholds = _thresholds!;
            return ListView(
              padding: EdgeInsets.all(tokens.spacingLg),
              children: [
                if (_errors.isNotEmpty) ...[
                  Container(
                    padding: EdgeInsets.all(tokens.spacingMd),
                    decoration: BoxDecoration(
                      color: tokens.negativeSubtle,
                      borderRadius: BorderRadius.circular(tokens.radiusMd),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: _errors
                          .map((e) => Text(e.message, style: tokens.detailStyle.copyWith(color: tokens.negativeContent)))
                          .toList(),
                    ),
                  ),
                  SizedBox(height: tokens.spacingLg),
                ],
                _ThresholdCard(
                  title: 'Kelembapan tanah',
                  prefix: 'thresholds.soil',
                  unit: '%',
                  threshold: thresholds.soil,
                  fieldError: _fieldError,
                  onChanged: (updated) {
                    setState(() => _thresholds = thresholds.copyWith(soil: updated));
                    _markDirty();
                  },
                ),
                SizedBox(height: tokens.spacingLg),
                _ThresholdCard(
                  title: 'Suhu',
                  prefix: 'thresholds.temp',
                  unit: '°C',
                  threshold: thresholds.temp,
                  fieldError: _fieldError,
                  onChanged: (updated) {
                    setState(() => _thresholds = thresholds.copyWith(temp: updated));
                    _markDirty();
                  },
                ),
                SizedBox(height: tokens.spacingLg),
                _ThresholdCard(
                  title: 'Kelembapan udara',
                  prefix: 'thresholds.humidity',
                  unit: '%',
                  threshold: thresholds.humidity,
                  fieldError: _fieldError,
                  onChanged: (updated) {
                    setState(() => _thresholds = thresholds.copyWith(humidity: updated));
                    _markDirty();
                  },
                ),
                SizedBox(height: tokens.spacingLg),
                _WaterThresholdCard(
                  threshold: thresholds.water,
                  fieldError: _fieldError,
                  onChanged: (updated) {
                    setState(() => _thresholds = thresholds.copyWith(water: updated));
                    _markDirty();
                  },
                ),
                SizedBox(height: tokens.spacingLg),
                Container(
                  padding: EdgeInsets.all(tokens.spacingMd),
                  decoration: BoxDecoration(
                    color: tokens.backgroundBase,
                    border: Border.all(color: tokens.borderSubtle),
                    borderRadius: BorderRadius.circular(tokens.radiusXl),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Target kelembapan penyiraman otomatis', style: tokens.labelStyle),
                      SizedBox(height: tokens.spacingSm),
                      _NumberField(
                        label: 'Target (%)',
                        value: _targetMoisture!,
                        error: _fieldError('targetMoisture'),
                        onChanged: (v) {
                          setState(() => _targetMoisture = v);
                          _markDirty();
                        },
                      ),
                    ],
                  ),
                ),
                SizedBox(height: tokens.spacingXl),
                if (_dirty)
                  Padding(
                    padding: EdgeInsets.only(bottom: tokens.spacingSm),
                    child: Text('Belum disimpan', style: tokens.detailStyle.copyWith(color: tokens.notice)),
                  ),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    key: const Key('config_save_button'),
                    onPressed: saveState.isLoading ? null : _save,
                    child: const Text('Simpan'),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ThresholdCard extends StatelessWidget {
  const _ThresholdCard({
    required this.title,
    required this.prefix,
    required this.unit,
    required this.threshold,
    required this.fieldError,
    required this.onChanged,
  });

  final String title;
  final String prefix;
  final String unit;
  final RangeThreshold threshold;
  final String? Function(String path) fieldError;
  final ValueChanged<RangeThreshold> onChanged;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.all(tokens.spacingMd),
      decoration: BoxDecoration(
        color: tokens.backgroundBase,
        border: Border.all(color: tokens.borderSubtle),
        borderRadius: BorderRadius.circular(tokens.radiusXl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: tokens.labelStyle.copyWith(fontSize: 16)),
          SizedBox(height: tokens.spacingMd),
          _NumberField(
            label: 'Kritis rendah ($unit)',
            value: threshold.criticalLow,
            error: fieldError('$prefix.criticalLow'),
            onChanged: (v) => onChanged(threshold.copyWith(criticalLow: v)),
          ),
          _NumberField(
            label: 'Peringatan rendah ($unit)',
            value: threshold.warningLow,
            error: fieldError('$prefix.warningLow'),
            onChanged: (v) => onChanged(threshold.copyWith(warningLow: v)),
          ),
          _NumberField(
            label: 'Peringatan tinggi ($unit)',
            value: threshold.warningHigh,
            error: fieldError('$prefix.warningHigh'),
            onChanged: (v) => onChanged(threshold.copyWith(warningHigh: v)),
          ),
          _NumberField(
            label: 'Kritis tinggi ($unit)',
            value: threshold.criticalHigh,
            error: fieldError('$prefix.criticalHigh'),
            onChanged: (v) => onChanged(threshold.copyWith(criticalHigh: v)),
          ),
        ],
      ),
    );
  }
}

class _WaterThresholdCard extends StatelessWidget {
  const _WaterThresholdCard({required this.threshold, required this.fieldError, required this.onChanged});

  final WaterThreshold threshold;
  final String? Function(String path) fieldError;
  final ValueChanged<WaterThreshold> onChanged;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.all(tokens.spacingMd),
      decoration: BoxDecoration(
        color: tokens.backgroundBase,
        border: Border.all(color: tokens.borderSubtle),
        borderRadius: BorderRadius.circular(tokens.radiusXl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Level air', style: tokens.labelStyle.copyWith(fontSize: 16)),
          SizedBox(height: tokens.spacingMd),
          _NumberField(
            label: 'Kritis (WATER_LOW) (%)',
            value: threshold.criticalLow,
            error: fieldError('thresholds.water.criticalLow'),
            onChanged: (v) => onChanged(threshold.copyWith(criticalLow: v)),
          ),
          _NumberField(
            label: 'Peringatan (%)',
            value: threshold.warningLow,
            error: fieldError('thresholds.water.warningLow'),
            onChanged: (v) => onChanged(threshold.copyWith(warningLow: v)),
          ),
        ],
      ),
    );
  }
}

class _NumberField extends StatelessWidget {
  const _NumberField({required this.label, required this.value, this.error, required this.onChanged});

  final String label;
  final double value;
  final String? error;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: EdgeInsets.only(bottom: tokens.spacingMd),
      child: TextFormField(
        initialValue: value.toString(),
        decoration: InputDecoration(
          label: Text(label),
          errorText: error,
        ),
        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
        onChanged: (text) {
          final parsed = double.tryParse(text);
          if (parsed != null) onChanged(parsed);
        },
      ),
    );
  }
}
