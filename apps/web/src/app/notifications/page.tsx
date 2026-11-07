"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@smart-plant/shared";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  ApiError,
} from "@/lib/api-client";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { useWsEvent } from "@/lib/ws-context";
import { useNotificationsCount } from "@/lib/notifications-context";
import styles from "./notifications.module.css";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const { refresh, resetUnread } = useNotificationsCount();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setError(null);
    listNotifications(null, 20)
      .then((res) => {
        setItems(res.items);
        setNextCursor(res.nextCursor);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat notifikasi."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useWsEvent(
    useCallback((event) => {
      if (event.type === "notification") {
        setItems((prev) => (prev ? [event.notification, ...prev] : [event.notification]));
      }
    }, []),
  );

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await listNotifications(nextCursor, 20);
      setItems((prev) => [...(prev ?? []), ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat notifikasi.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkRead(id: string) {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? prev);
    try {
      await markNotificationRead(id);
      refresh();
    } catch {
      load();
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? prev);
      resetUnread();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menandai semua dibaca.");
    } finally {
      setMarkingAll(false);
    }
  }

  const hasUnread = items?.some((n) => n.readAt === null) ?? false;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="sp-h1">Peringatan</h1>
        <Button variant="secondary" onClick={handleMarkAllRead} loading={markingAll} disabled={!hasUnread}>
          Tandai semua dibaca
        </Button>
      </div>

      {error && <ErrorState body={error} action={<Button onClick={load}>Coba lagi</Button>} />}

      {items === null && !error && <LoadingState label="Memuat notifikasi..." />}

      {items !== null && items.length === 0 && !error && (
        <EmptyState title="Belum ada notifikasi" body="Peringatan dan pembaruan status akan muncul di sini." />
      )}

      {items !== null && items.length > 0 && (
        <div className={styles.list}>
          {items.map((n) => (
            <NotificationRow key={n.id} notification={n} onMarkRead={handleMarkRead} />
          ))}
        </div>
      )}

      {nextCursor && (
        <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}
