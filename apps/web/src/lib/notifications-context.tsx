"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { listNotifications } from "./api-client";
import { useAuth } from "./auth-context";
import { useWsEvent } from "./ws-context";

interface NotificationsCountContextValue {
  unreadCount: number;
  refresh: () => void;
  bumpUnread: () => void;
  resetUnread: () => void;
}

const NotificationsCountContext = createContext<NotificationsCountContextValue>({
  unreadCount: 0,
  refresh: () => {},
  bumpUnread: () => {},
  resetUnread: () => {},
});

export function NotificationsCountProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshing = useRef(false);

  const refresh = useCallback(() => {
    if (refreshing.current) return;
    refreshing.current = true;
    listNotifications(null, 1)
      .then((res) => setUnreadCount(res.unreadCount))
      .catch(() => undefined)
      .finally(() => {
        refreshing.current = false;
      });
  }, []);

  useEffect(() => {
    if (status === "authenticated") refresh();
    if (status === "unauthenticated") setUnreadCount(0);
  }, [status, refresh]);

  useWsEvent(
    useCallback(
      (event) => {
        if (event.type === "notification") {
          setUnreadCount((count) => count + 1);
        }
      },
      [],
    ),
  );

  const bumpUnread = useCallback(() => setUnreadCount((count) => count + 1), []);
  const resetUnread = useCallback(() => setUnreadCount(0), []);

  return (
    <NotificationsCountContext.Provider value={{ unreadCount, refresh, bumpUnread, resetUnread }}>
      {children}
    </NotificationsCountContext.Provider>
  );
}

export function useNotificationsCount(): NotificationsCountContextValue {
  return useContext(NotificationsCountContext);
}
