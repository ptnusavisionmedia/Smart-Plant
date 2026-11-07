"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { WsServerEvent } from "@smart-plant/shared";
import { wsClient, type WsConnectionStatus } from "./ws-client";
import { useAuth } from "./auth-context";

interface WsContextValue {
  status: WsConnectionStatus;
}

const WsContext = createContext<WsContextValue>({ status: "closed" });

export function WsProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [status, setStatus] = useState<WsConnectionStatus>("closed");

  useEffect(() => {
    const unsubscribe = wsClient.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      wsClient.connect();
    } else {
      wsClient.disconnect();
    }
  }, [authStatus]);

  return <WsContext.Provider value={{ status }}>{children}</WsContext.Provider>;
}

export function useWsStatus(): WsConnectionStatus {
  return useContext(WsContext).status;
}

/** Subscribes `handler` to every WS event for the lifetime of the component. */
export function useWsEvent(handler: (event: WsServerEvent) => void): void {
  useEffect(() => {
    return wsClient.subscribe(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handler]);
}
