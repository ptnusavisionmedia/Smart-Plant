"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  DeviceConfig,
  RangeThreshold as RangeThresholdType,
  Thresholds,
  UpdateDeviceConfigRequest,
} from "@smart-plant/shared";
import { Button } from "@/components/ui/Button";
import styles from "./DeviceConfigForm.module.css";

type Errors = Record<string, string>;

function validate(thresholds: Thresholds, targetMoisture: number): Errors {
  const errors: Errors = {};

  (["soil", "temp", "humidity"] as const).forEach((key) => {
    const t = thresholds[key];
    if (!(t.criticalLow < t.warningLow)) errors[`${key}.criticalLow`] = "Harus lebih rendah dari warning rendah";
    if (!(t.warningLow < t.warningHigh)) errors[`${key}.warningLow`] = "Harus lebih rendah dari warning tinggi";
    if (!(t.warningHigh < t.criticalHigh)) errors[`${key}.warningHigh`] = "Harus lebih rendah dari critical tinggi";
  });

  if (!(thresholds.water.criticalLow < thresholds.water.warningLow)) {
    errors["water.criticalLow"] = "Harus lebih rendah dari warning air";
  }

  if (!(targetMoisture > thresholds.soil.warningLow)) {
    errors["targetMoisture"] = "Harus lebih tinggi dari ambang kering (warning rendah) tanah";
  }

  return errors;
}

function RangeThresholdFields({
  title,
  unit,
  value,
  errorPrefix,
  errors,
  onChange,
}: {
  title: string;
  unit: string;
  value: RangeThresholdType;
  errorPrefix: "soil" | "temp" | "humidity";
  errors: Errors;
  onChange: (next: RangeThresholdType) => void;
}) {
  function field(key: keyof RangeThresholdType, label: string) {
    const errorKey = `${errorPrefix}.${key}`;
    return (
      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          {label} ({unit})
        </label>
        <input
          type="number"
          className={styles.input}
          value={value[key]}
          onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
        />
        {errors[errorKey] && <p className={styles.fieldError}>{errors[errorKey]}</p>}
      </div>
    );
  }

  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupTitle}>{title}</legend>
      <div className={styles.grid4}>
        {field("criticalLow", "Kritis rendah")}
        {field("warningLow", "Waspada rendah")}
        {field("warningHigh", "Waspada tinggi")}
        {field("criticalHigh", "Kritis tinggi")}
      </div>
    </fieldset>
  );
}

export function DeviceConfigForm({
  config,
  onSave,
}: {
  config: DeviceConfig;
  onSave: (body: UpdateDeviceConfigRequest) => Promise<void>;
}) {
  const [thresholds, setThresholds] = useState<Thresholds>(config.thresholds);
  const [targetMoisture, setTargetMoisture] = useState(config.targetMoisture);
  const [maxPumpSeconds, setMaxPumpSeconds] = useState(config.maxPumpSeconds);
  const [cooldownSeconds, setCooldownSeconds] = useState(config.cooldownSeconds);
  const [telemetryIntervalSeconds, setTelemetryIntervalSeconds] = useState(config.telemetryIntervalSeconds);
  const [waterLevelSource, setWaterLevelSource] = useState(config.waterLevelSource);
  const [tankHeightCm, setTankHeightCm] = useState(config.tankHeightCm);
  const [tankMaxLevelCm, setTankMaxLevelCm] = useState(config.tankMaxLevelCm);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => validate(thresholds, targetMoisture), [thresholds, targetMoisture]);
  const hasErrors = Object.keys(errors).length > 0;

  function markDirty() {
    setDirty(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (hasErrors) return;
    setSaving(true);
    try {
      await onSave({
        thresholds,
        targetMoisture,
        maxPumpSeconds,
        cooldownSeconds,
        telemetryIntervalSeconds,
        waterLevelSource,
        tankHeightCm,
        tankMaxLevelCm,
      });
      setDirty(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {hasErrors && (
        <p className={styles.summaryError}>Periksa kembali nilai ambang batas yang ditandai di bawah.</p>
      )}
      {submitError && <p className={styles.summaryError}>{submitError}</p>}

      <RangeThresholdFields
        title="Kelembapan tanah (%)"
        unit="%"
        value={thresholds.soil}
        errorPrefix="soil"
        errors={errors}
        onChange={(next) => {
          setThresholds((t) => ({ ...t, soil: next }));
          markDirty();
        }}
      />
      <RangeThresholdFields
        title="Suhu (°C)"
        unit="°C"
        value={thresholds.temp}
        errorPrefix="temp"
        errors={errors}
        onChange={(next) => {
          setThresholds((t) => ({ ...t, temp: next }));
          markDirty();
        }}
      />
      <RangeThresholdFields
        title="Kelembapan udara (%)"
        unit="%"
        value={thresholds.humidity}
        errorPrefix="humidity"
        errors={errors}
        onChange={(next) => {
          setThresholds((t) => ({ ...t, humidity: next }));
          markDirty();
        }}
      />

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Level air</legend>
        <div className={styles.grid4}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Kritis (WATER LOW) (%)</label>
            <input
              type="number"
              className={styles.input}
              value={thresholds.water.criticalLow}
              onChange={(e) => {
                setThresholds((t) => ({ ...t, water: { ...t.water, criticalLow: Number(e.target.value) } }));
                markDirty();
              }}
            />
            {errors["water.criticalLow"] && <p className={styles.fieldError}>{errors["water.criticalLow"]}</p>}
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Waspada (%)</label>
            <input
              type="number"
              className={styles.input}
              value={thresholds.water.warningLow}
              onChange={(e) => {
                setThresholds((t) => ({ ...t, water: { ...t.water, warningLow: Number(e.target.value) } }));
                markDirty();
              }}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Target & penyiraman</legend>
        <div className={styles.grid4}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Target kelembapan (%)</label>
            <input
              type="number"
              className={styles.input}
              value={targetMoisture}
              onChange={(e) => {
                setTargetMoisture(Number(e.target.value));
                markDirty();
              }}
            />
            {errors["targetMoisture"] && <p className={styles.fieldError}>{errors["targetMoisture"]}</p>}
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Maks. durasi pompa (detik)</label>
            <input
              type="number"
              min={1}
              max={60}
              className={styles.input}
              value={maxPumpSeconds}
              onChange={(e) => {
                setMaxPumpSeconds(Number(e.target.value));
                markDirty();
              }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Cooldown (detik)</label>
            <input
              type="number"
              min={0}
              className={styles.input}
              value={cooldownSeconds}
              onChange={(e) => {
                setCooldownSeconds(Number(e.target.value));
                markDirty();
              }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Interval telemetri (detik)</label>
            <input
              type="number"
              min={5}
              className={styles.input}
              value={telemetryIntervalSeconds}
              onChange={(e) => {
                setTelemetryIntervalSeconds(Number(e.target.value));
                markDirty();
              }}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Sensor level air & tangki</legend>
        <div className={styles.grid4}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Sumber sensor</label>
            <select
              className={styles.input}
              value={waterLevelSource}
              onChange={(e) => {
                setWaterLevelSource(e.target.value as typeof waterLevelSource);
                markDirty();
              }}
            >
              <option value="ultrasonic">Ultrasonic (HC-SR04)</option>
              <option value="float_switch">Saklar pelampung</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tinggi tangki (cm)</label>
            <input
              type="number"
              className={styles.input}
              value={tankHeightCm}
              onChange={(e) => {
                setTankHeightCm(Number(e.target.value));
                markDirty();
              }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Level maks. tangki (cm)</label>
            <input
              type="number"
              className={styles.input}
              value={tankMaxLevelCm}
              onChange={(e) => {
                setTankMaxLevelCm(Number(e.target.value));
                markDirty();
              }}
            />
          </div>
        </div>
      </fieldset>

      <div className={styles.footer}>
        {dirty && <span className={styles.unsaved}>Belum disimpan</span>}
        <Button type="submit" loading={saving} disabled={hasErrors}>
          Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
