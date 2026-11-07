"use client";

import { useEffect, useRef, useState } from "react";
import type { Status } from "@smart-plant/shared";
import { STATUS_LABEL } from "@/lib/format";
import styles from "./MoistureRing.module.css";

const STATUS_COLOR_VAR: Record<Status, string> = {
  NORMAL: "var(--sp-positive)",
  WARNING: "var(--sp-notice)",
  CRITICAL: "var(--sp-negative)",
  WATER_LOW: "var(--sp-informative)",
};

/** Signature moisture ring (DESIGN.md "Moisture ring"). 72px on cards, 120px on detail. */
export function MoistureRing({
  value,
  status,
  size = 72,
}: {
  value: number | null;
  status: Status;
  size?: 72 | 120;
}) {
  const [displayValue, setDisplayValue] = useState(value ?? 0);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (value === null) return;
    if (prefersReducedMotion.current) {
      setDisplayValue(value);
      return;
    }
    const start = displayValue;
    const end = value;
    const startTime = performance.now();
    const duration = 250;
    let frame: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplayValue(start + (end - start) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const radius = size === 120 ? 54 : 32;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, displayValue));
  const offset = circumference * (1 - pct / 100);
  const valueFontClass = size === 120 ? "data-lg" : "data-md";

  const label =
    value === null
      ? "Kelembapan tanah tidak tersedia"
      : `Kelembapan tanah ${Math.round(value)} persen, status ${STATUS_LABEL[status]}`;

  return (
    <div className={styles.wrap} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--sp-border-subtle)"
          strokeWidth={strokeWidth}
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={STATUS_COLOR_VAR[status]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div className={styles.center}>
        <span className={`sp-tabular ${styles[valueFontClass]}`}>
          {value === null ? "-" : Math.round(displayValue)}
          <span className={styles.unit}>%</span>
        </span>
      </div>
    </div>
  );
}
