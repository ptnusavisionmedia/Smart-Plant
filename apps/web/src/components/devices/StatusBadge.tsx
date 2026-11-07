import type { Status } from "@smart-plant/shared";
import { STATUS_LABEL } from "@/lib/format";
import styles from "./StatusBadge.module.css";

export type DisplayStatus = Status | "OFFLINE" | "SENSOR_ERROR";

const ICONS: Record<DisplayStatus, ReactIcon> = {
  NORMAL: CheckCircleIcon,
  WARNING: AlertTriangleIcon,
  CRITICAL: AlertOctagonIcon,
  WATER_LOW: DropletOffIcon,
  OFFLINE: WifiOffIcon,
  SENSOR_ERROR: HelpCircleIcon,
};

const CLASS_BY_STATUS: Record<DisplayStatus, string> = {
  NORMAL: "normal",
  WARNING: "warning",
  CRITICAL: "critical",
  WATER_LOW: "waterLow",
  OFFLINE: "offline",
  SENSOR_ERROR: "offline",
};

const LABEL_BY_STATUS: Record<DisplayStatus, string> = {
  NORMAL: STATUS_LABEL.NORMAL,
  WARNING: STATUS_LABEL.WARNING,
  CRITICAL: STATUS_LABEL.CRITICAL,
  WATER_LOW: STATUS_LABEL.WATER_LOW,
  OFFLINE: "Offline",
  SENSOR_ERROR: "Sensor bermasalah",
};

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const Icon = ICONS[status];
  const variantClass = styles[CLASS_BY_STATUS[status]];
  return (
    <span className={[styles.badge, variantClass, className].filter(Boolean).join(" ")}>
      <Icon />
      {LABEL_BY_STATUS[status]}
    </span>
  );
}

type ReactIcon = () => JSX.Element;

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v3m0 3h.01M10.3 3.9L2.5 18a1.5 1.5 0 001.3 2.25h16.4a1.5 1.5 0 001.3-2.25L13.7 3.9a1.5 1.5 0 00-2.6 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertOctagonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2zM12 8v4m0 4h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropletOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 13.5c0 2.76-2.24 5-5 5a5 5 0 01-4.9-6M13 3s2.5 2.9 4 5.5M2 2l20 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WifiOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 1l22 22M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015.5-3M19 12.5a10 10 0 00-2.5-2M12 20h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HelpCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.1 9a3 3 0 115.82 1c0 2-2.92 2.5-2.92 4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
