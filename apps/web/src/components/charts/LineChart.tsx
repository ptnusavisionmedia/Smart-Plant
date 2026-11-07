"use client";

import styles from "./LineChart.module.css";

interface Point {
  label: string;
  value: number | null;
}

/** Hand-rolled SVG line chart per DESIGN.md "Chart panel": 2px line, no gradients, no dual axes. */
export function LineChart({
  title,
  unit,
  color,
  points,
  height = 240,
}: {
  title: string;
  unit: string;
  color: string;
  points: Point[];
  height?: number;
}) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const width = 720;
  const paddingLeft = 40;
  const paddingBottom = 24;
  const paddingTop = 12;
  const plotWidth = width - paddingLeft - 12;
  const plotHeight = height - paddingTop - paddingBottom;

  if (values.length === 0) {
    return (
      <div className={styles.panel}>
        <Header title={title} color={color} />
        <p className={styles.empty}>Tidak ada data pada rentang ini.</p>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const yPad = range * 0.1;
  const domainMin = min - yPad;
  const domainMax = max + yPad;

  function x(i: number): number {
    if (points.length <= 1) return paddingLeft;
    return paddingLeft + (i / (points.length - 1)) * plotWidth;
  }
  function y(value: number): number {
    return paddingTop + plotHeight - ((value - domainMin) / (domainMax - domainMin)) * plotHeight;
  }

  const segments: string[] = [];
  let current: string | null = null;
  points.forEach((p, i) => {
    if (p.value === null) {
      current = null;
      return;
    }
    const command = `${x(i)},${y(p.value)}`;
    if (current === null) {
      segments.push(`M${command}`);
    } else {
      segments.push(`L${command}`);
    }
    current = command;
  });
  const path = segments.join(" ");

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const tickCount = Math.min(6, points.length);
  const tickIndexes = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / Math.max(1, tickCount - 1)) * (points.length - 1)),
  );

  return (
    <div className={styles.panel}>
      <Header title={title} color={color} />
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={`${title} dari waktu ke waktu`}>
        {gridLines.map((g) => {
          const yy = paddingTop + plotHeight * g;
          const value = domainMax - g * (domainMax - domainMin);
          return (
            <g key={g}>
              <line x1={paddingLeft} x2={width - 12} y1={yy} y2={yy} stroke="var(--sp-border-subtle)" strokeWidth={1} />
              <text x={paddingLeft - 6} y={yy} textAnchor="end" dominantBaseline="middle" className={styles.axisLabel}>
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {tickIndexes.map((idx) => (
          <text key={idx} x={x(idx)} y={height - 6} textAnchor="middle" className={styles.axisLabel}>
            {points[idx]?.label}
          </text>
        ))}
      </svg>
      <p className={styles.unitLabel}>Satuan: {unit}</p>
    </div>
  );
}

function Header({ title, color }: { title: string; color: string }) {
  return (
    <div className={styles.header}>
      <span className={styles.dot} style={{ backgroundColor: color }} aria-hidden />
      <h3 className={styles.title}>{title}</h3>
    </div>
  );
}
