import type { Notification } from "@smart-plant/shared";
import { formatRelativeTime } from "@/lib/format";
import styles from "./NotificationRow.module.css";

type Severity = "negative" | "notice" | "informative" | "neutral";

function severityOf(n: Notification): Severity {
  if (n.type === "DEVICE_OFFLINE" || n.type === "EMERGENCY_STOP") return "negative";
  if (n.type === "WATER_LOW") return "informative";
  if (n.reasons.some((r) => r.includes("CRITICAL"))) return "negative";
  if (n.reasons.some((r) => r.includes("WARNING")) || n.type === "STATUS_CHANGE") return "notice";
  return "neutral";
}

const UNREAD_CLASS: Record<Severity, string | undefined> = {
  negative: "unreadNegative",
  notice: "unreadNotice",
  informative: "unreadInformative",
  neutral: undefined,
};

export function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const unread = notification.readAt === null;
  const severity = severityOf(notification);
  const unreadClassKey = UNREAD_CLASS[severity];

  return (
    <div className={[styles.row, unread && unreadClassKey ? styles[unreadClassKey] : ""].filter(Boolean).join(" ")}>
      <SeverityIcon severity={severity} />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{notification.title}</span>
          {unread && <span className={styles.newBadge}>Baru</span>}
        </div>
        <p className={styles.message}>{notification.body}</p>
        <span className={styles.timestamp}>{formatRelativeTime(notification.createdAt)}</span>
      </div>
      {unread && (
        <button type="button" className={styles.action} onClick={() => onMarkRead(notification.id)}>
          Tandai dibaca
        </button>
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: Severity }) {
  const color =
    severity === "negative"
      ? "var(--sp-negative)"
      : severity === "notice"
        ? "var(--sp-notice)"
        : severity === "informative"
          ? "var(--sp-informative)"
          : "var(--sp-neutral-subdued)";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 8v5M12 16h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
