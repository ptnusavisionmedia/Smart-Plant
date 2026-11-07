import { formatRelativeTime } from "@/lib/format";
import styles from "./LiveIndicator.module.css";

/** DESIGN.md "Live and stale indicator": static dot, never pulsing. */
export function LiveIndicator({ lastSeenAt, isLive }: { lastSeenAt: string | null; isLive: boolean }) {
  return (
    <span className={styles.wrap}>
      <span className={isLive ? styles.dotLive : styles.dotStale} aria-hidden />
      <span>{isLive ? "Live" : "Tertunda"}</span>
      <span className={styles.time}>
        {lastSeenAt ? `Diperbarui ${formatRelativeTime(lastSeenAt)}` : "Belum ada data"}
      </span>
    </span>
  );
}
