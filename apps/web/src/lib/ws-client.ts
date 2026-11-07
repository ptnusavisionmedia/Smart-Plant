/**
 * WebSocket client for `GET /ws?token=<accessToken>` (apps/api/src/plugins/websocket.ts).
 * Reconnects with exponential backoff and re-authenticates with a fresh
 * access token on every (re)connect attempt, refreshing it first if needed.
 */
import { WsServerEventSchema, type WsServerEvent } from "@smart-plant/shared";
import { getAccessToken, refreshSession } from "./api-client";

export type WsConnectionStatus = "connecting" | "open" | "closed";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";
const MAX_BACKOFF_MS = 30_000;

type EventListener = (event: WsServerEvent) => void;
type StatusListener = (status: WsConnectionStatus) => void;

class WsClient {
  private socket: WebSocket | null = null;
  private manuallyClosed = true;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: WsConnectionStatus = "closed";
  private eventListeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();

  getStatus(): WsConnectionStatus {
    return this.status;
  }

  subscribe(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  connect(): void {
    this.manuallyClosed = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    void this.attemptConnect();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.setStatus("closed");
  }

  private setStatus(status: WsConnectionStatus) {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private async attemptConnect(): Promise<void> {
    if (this.manuallyClosed) return;

    let token = getAccessToken();
    if (!token) {
      const ok = await refreshSession();
      token = ok ? getAccessToken() : null;
    }
    if (!token) {
      this.scheduleReconnect();
      return;
    }

    this.setStatus("connecting");
    const url = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("open");
    };

    socket.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data as string);
      } catch {
        return;
      }
      const result = WsServerEventSchema.safeParse(parsed);
      if (!result.success) return;
      for (const listener of this.eventListeners) listener(result.data);
    };

    socket.onclose = () => {
      this.setStatus("closed");
      this.socket = null;
      if (!this.manuallyClosed) this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.manuallyClosed) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.attemptConnect();
    }, delay);
  }
}

export const wsClient = new WsClient();
export type { WsServerEvent };
