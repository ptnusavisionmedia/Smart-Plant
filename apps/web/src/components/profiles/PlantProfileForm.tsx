"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { RangeThreshold as RangeThresholdType, Thresholds } from "@smart-plant/shared";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./PlantProfileForm.module.css";

const DEFAULT_THRESHOLDS: Thresholds = {
  soil: { criticalLow: 25, warningLow: 40, warningHigh: 71, criticalHigh: 85 },
  temp: { criticalLow: 15, warningLow: 18, warningHigh: 31, criticalHigh: 35 },
  humidity: { criticalLow: 40, warningLow: 50, warningHigh: 71, criticalHigh: 80 },
  water: { warningLow: 30, criticalLow: 15 },
};

type Errors = Record<string, string>;

function validate(thresholds: Thresholds): Errors {
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
  return errors;
}

function RangeFields({
  title,
  value,
  errorPrefix,
  errors,
  onChange,
}: {
  title: string;
  value: RangeThresholdType;
  errorPrefix: "soil" | "temp" | "humidity";
  errors: Errors;
  onChange: (next: RangeThresholdType) => void;
}) {
  function field(key: keyof RangeThresholdType, label: string) {
    const errorKey = `${errorPrefix}.${key}`;
    return (
      <div className={styles.field}>
        <label className={styles.fieldLabel}>{label}</label>
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

export function PlantProfileForm({
  initialName = "",
  initialThresholds = DEFAULT_THRESHOLDS,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialThresholds?: Thresholds;
  submitLabel: string;
  onSubmit: (name: string, thresholds: Thresholds) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [thresholds, setThresholds] = useState<Thresholds>(initialThresholds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = useMemo(() => validate(thresholds), [thresholds]);
  const hasErrors = Object.keys(errors).length > 0 || name.trim().length === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (hasErrors) return;
    setSaving(true);
    try {
      await onSubmit(name.trim(), thresholds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.summaryError}>{error}</p>}
      <Input label="Nama profil" required value={name} onChange={(e) => setName(e.target.value)} />
      <RangeFields
        title="Kelembapan tanah (%)"
        value={thresholds.soil}
        errorPrefix="soil"
        errors={errors}
        onChange={(next) => setThresholds((t) => ({ ...t, soil: next }))}
      />
      <RangeFields
        title="Suhu (°C)"
        value={thresholds.temp}
        errorPrefix="temp"
        errors={errors}
        onChange={(next) => setThresholds((t) => ({ ...t, temp: next }))}
      />
      <RangeFields
        title="Kelembapan udara (%)"
        value={thresholds.humidity}
        errorPrefix="humidity"
        errors={errors}
        onChange={(next) => setThresholds((t) => ({ ...t, humidity: next }))}
      />
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Level air (%)</legend>
        <div className={styles.grid4}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Kritis (WATER LOW)</label>
            <input
              type="number"
              className={styles.input}
              value={thresholds.water.criticalLow}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, water: { ...t.water, criticalLow: Number(e.target.value) } }))
              }
            />
            {errors["water.criticalLow"] && <p className={styles.fieldError}>{errors["water.criticalLow"]}</p>}
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Waspada</label>
            <input
              type="number"
              className={styles.input}
              value={thresholds.water.warningLow}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, water: { ...t.water, warningLow: Number(e.target.value) } }))
              }
            />
          </div>
        </div>
      </fieldset>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" loading={saving} disabled={hasErrors}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
