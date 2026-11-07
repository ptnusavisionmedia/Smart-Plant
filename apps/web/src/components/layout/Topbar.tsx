"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWsStatus } from "@/lib/ws-context";
import { useNotificationsCount } from "@/lib/notifications-context";
import styles from "./Topbar.module.css";

export function Topbar({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { user, logout } = useAuth();
  const wsStatus = useWsStatus();
  const { unreadCount } = useNotificationsCount();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onOpenSidebar}
        aria-label="Buka navigasi"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className={styles.spacer} />

      <span className={styles.connection}>
        <span className={wsStatus === "open" ? styles.dotLive : styles.dotStale} aria-hidden />
        {wsStatus === "open" ? "Live" : wsStatus === "connecting" ? "Menghubungkan..." : "Tertunda"}
      </span>

      <Link href="/notifications" className={styles.bell} aria-label={`Notifikasi, ${unreadCount} belum dibaca`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </Link>

      <div className={styles.account}>
        <button
          type="button"
          className={styles.accountButton}
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className={styles.avatar} aria-hidden>
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
          <span className={styles.userName}>{user?.name ?? "Pengguna"}</span>
        </button>
        {menuOpen && (
          <div className={styles.menu} role="menu">
            <Link href="/settings" role="menuitem" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
              Pengaturan
            </Link>
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
            >
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
