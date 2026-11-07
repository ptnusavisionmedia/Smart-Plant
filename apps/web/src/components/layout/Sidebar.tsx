"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationsCount } from "@/lib/notifications-context";
import { SproutIcon } from "@/components/ui/icons";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Ringkasan" },
  { href: "/notifications", label: "Peringatan" },
  { href: "/profiles", label: "Profil tanaman" },
  { href: "/settings", label: "Pengaturan" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationsCount();

  return (
    <nav className={styles.sidebar} aria-label="Navigasi utama">
      <div className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden>
          <SproutIcon size={20} />
        </span>
        <span>Smart Plant</span>
      </div>
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={active ? styles.itemActive : styles.item}
                aria-current={active ? "page" : undefined}
              >
                <span>{item.label}</span>
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span className={styles.badge} aria-label={`${unreadCount} peringatan belum dibaca`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
