"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/ui/States";
import { SproutIcon } from "@/components/ui/icons";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "idle" || status === "authenticated") {
    return (
      <div className={styles.page}>
        <LoadingState label="Memeriksa sesi..." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden>
            <SproutIcon size={22} />
          </span>
          <span>Smart Plant</span>
        </div>
        {children}
      </div>
    </div>
  );
}
