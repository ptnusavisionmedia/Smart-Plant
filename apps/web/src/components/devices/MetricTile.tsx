import styles from "./MetricTile.module.css";

export function MetricTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <p className={`sp-tabular ${styles.value}`}>
        {value}
        {unit && <span className={styles.unit}> {unit}</span>}
      </p>
    </div>
  );
}
