"use client";

import styles from "./Toggle.module.css";

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <label className={styles.row}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={checked ? styles.trackOn : styles.track}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span className={checked ? styles.thumbOn : styles.thumb} />
      </button>
    </label>
  );
}
