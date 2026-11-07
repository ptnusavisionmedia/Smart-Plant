import type { ReactNode } from "react";
import styles from "./States.module.css";
import { Spinner } from "./Spinner";

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className={styles.state}>
      <Spinner size={28} />
      <p className={styles.body}>{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.state}>
      <div className={styles.icon} aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2v6m0 8v6m-7-7h6m8 0h-6"
            stroke="var(--sp-neutral-subdued)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className={styles.title}>{title}</h3>
      {body && <p className={styles.body}>{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  body,
  action,
}: {
  title?: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.state}>
      <div className={styles.iconNegative} aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="var(--sp-negative)" strokeWidth="2" />
          <path d="M12 8v5M12 16h.01" stroke="var(--sp-negative)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
      {action}
    </div>
  );
}
