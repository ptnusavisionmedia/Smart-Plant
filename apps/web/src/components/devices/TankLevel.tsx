import styles from "./TankLevel.module.css";

/** Tank level indicator (DESIGN.md "Tank level indicator"). */
export function TankLevel({
  percent,
  height = 72,
}: {
  percent: number | null;
  height?: 72 | 200;
}) {
  if (percent === null) {
    return (
      <div className={styles.unavailable} style={{ height }}>
        <div className={styles.track} />
        <p className={styles.unavailableText}>Level air tidak tersedia</p>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, percent));
  const isWaterLow = clamped <= 15;
  const isWarning = clamped <= 30;

  return (
    <div className={styles.wrap}>
      <div className={styles.track} style={{ height }}>
        <div className={styles.fill} style={{ height: `${clamped}%` }} />
        <div className={styles.marker} style={{ bottom: "30%" }} aria-hidden />
        <div className={styles.marker} style={{ bottom: "15%" }} aria-hidden />
      </div>
      <p className={`sp-tabular ${styles.label}`}>Air {Math.round(clamped)}%</p>
      {isWaterLow && <p className={styles.refill}>Isi ulang tangki</p>}
      {!isWaterLow && isWarning && <p className={styles.refillWarning}>Air mulai rendah</p>}
    </div>
  );
}
