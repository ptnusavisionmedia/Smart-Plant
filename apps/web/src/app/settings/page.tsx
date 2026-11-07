"use client";

import { useEffect, useState } from "react";
import type { NotificationPreferences } from "@smart-plant/shared";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  linkTelegram,
  unlinkTelegram,
  ApiError,
} from "@/lib/api-client";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { formatDateTime } from "@/lib/format";
import styles from "./settings.module.css";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [telegramCode, setTelegramCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!telegramCode) return;
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((telegramCode.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [telegramCode]);

  async function updatePref(key: "inApp" | "push" | "telegram", value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingPrefs(true);
    try {
      const saved = await updateNotificationPreferences({ [key]: value });
      setPrefs(saved);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal menyimpan preferensi.", "negative");
      setPrefs(prefs);
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleLinkTelegram() {
    setTelegramLoading(true);
    try {
      const res = await linkTelegram();
      setTelegramCode({ code: res.code, expiresAt: Date.now() + res.expiresInSeconds * 1000 });
      setSecondsLeft(res.expiresInSeconds);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal membuat kode tautan Telegram.", "negative");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function handleUnlinkTelegram() {
    setTelegramLoading(true);
    try {
      await unlinkTelegram();
      setTelegramCode(null);
      const updated = await getNotificationPreferences();
      setPrefs(updated);
      showToast("Tautan Telegram dilepas.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Gagal melepas tautan Telegram.", "negative");
    } finally {
      setTelegramLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className="sp-h1">Pengaturan</h1>

      <section className={styles.card}>
        <h2 className="sp-h3">Profil</h2>
        {user ? (
          <dl className={styles.profile}>
            <div>
              <dt>Nama</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Status email</dt>
              <dd>{user.emailVerified ? "Terverifikasi" : "Belum terverifikasi"}</dd>
            </div>
            <div>
              <dt>Bergabung sejak</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
            </div>
          </dl>
        ) : (
          <LoadingState label="Memuat profil..." />
        )}
        <Button variant="secondary" onClick={() => void logout()}>
          Keluar
        </Button>
      </section>

      <section className={styles.card}>
        <h2 className="sp-h3">Preferensi notifikasi</h2>
        {prefs ? (
          <div className={styles.toggles}>
            <Toggle
              label="Notifikasi dalam aplikasi"
              description="Tampilkan peringatan di halaman Peringatan."
              checked={prefs.inApp}
              onChange={(v) => updatePref("inApp", v)}
              disabled={savingPrefs}
            />
            <Toggle
              label="Notifikasi push"
              description="Kirim notifikasi push ke aplikasi mobile."
              checked={prefs.push}
              onChange={(v) => updatePref("push", v)}
              disabled={savingPrefs}
            />
            <Toggle
              label="Notifikasi Telegram"
              description="Kirim peringatan melalui bot Telegram."
              checked={prefs.telegram}
              onChange={(v) => updatePref("telegram", v)}
              disabled={savingPrefs || !prefs.telegramLinked}
            />
          </div>
        ) : (
          <LoadingState label="Memuat preferensi..." />
        )}
      </section>

      <section className={styles.card}>
        <h2 className="sp-h3">Integrasi Telegram</h2>
        {prefs?.telegramLinked ? (
          <>
            <p className={styles.body}>Akun Telegram Anda sudah tertaut.</p>
            <Button variant="secondary" onClick={handleUnlinkTelegram} loading={telegramLoading}>
              Lepas tautan Telegram
            </Button>
          </>
        ) : telegramCode ? (
          <div className={styles.telegramCode}>
            <p className={styles.body}>
              Kirim pesan berikut ke bot Telegram kami dalam {secondsLeft > 0 ? `${secondsLeft} detik` : "beberapa saat"}:
            </p>
            <code className={styles.code}>/link {telegramCode.code}</code>
            {secondsLeft <= 0 && <p className={styles.expired}>Kode sudah kedaluwarsa, buat kode baru.</p>}
            <Button onClick={handleLinkTelegram} loading={telegramLoading}>
              Buat kode baru
            </Button>
          </div>
        ) : (
          <>
            <p className={styles.body}>
              Tautkan akun Telegram Anda untuk menerima peringatan darurat lewat bot kami.
            </p>
            <Button onClick={handleLinkTelegram} loading={telegramLoading}>
              Tautkan Telegram
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
