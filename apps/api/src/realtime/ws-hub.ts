import type { WebSocket } from "ws";
import type { WsServerEvent } from "@smart-plant/shared";
import { eventBus } from "./event-bus.js";

const HEARTBEAT_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 90_000;
/** Above this many buffered bytes, a slow client's `reading` events are dropped (never status/notification). */
const BACKPRESSURE_THRESHOLD_BYTES = 1_000_000;

interface Connection {
  socket: WebSocket;
  lastActivityAt: number;
}

export class WsHub {
  private readonly rooms = new Map<string, Set<Connection>>();
  private readonly unsubscribe: () => void;
  private readonly heartbeatTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.unsubscribe = eventBus.onWsEvent((userId, event) => this.broadcast(userId, event));
    this.heartbeatTimer = setInterval(() => this.sweep(), HEARTBEAT_INTERVAL_MS);
  }

  add(userId: string, socket: WebSocket) {
    const connection: Connection = { socket, lastActivityAt: Date.now() };
    const room = this.rooms.get(userId) ?? new Set<Connection>();
    room.add(connection);
    this.rooms.set(userId, room);

    socket.on("pong", () => {
      connection.lastActivityAt = Date.now();
    });
    socket.on("message", () => {
      connection.lastActivityAt = Date.now();
    });
    socket.on("close", () => {
      room.delete(connection);
      if (room.size === 0) this.rooms.delete(userId);
    });
  }

  private broadcast(userId: string, event: WsServerEvent) {
    const room = this.rooms.get(userId);
    if (!room) return;

    const payload = JSON.stringify(event);
    for (const connection of room) {
      if (connection.socket.readyState !== connection.socket.OPEN) continue;

      const buffered = connection.socket.bufferedAmount;
      if (event.type === "reading" && buffered > BACKPRESSURE_THRESHOLD_BYTES) {
        continue; // drop reading events for slow clients; never drop status/notification/watering
      }
      connection.socket.send(payload);
    }
  }

  private sweep() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      for (const connection of room) {
        if (now - connection.lastActivityAt > IDLE_TIMEOUT_MS) {
          connection.socket.close(1000, "idle timeout");
          continue;
        }
        if (connection.socket.readyState === connection.socket.OPEN) {
          connection.socket.ping();
        }
      }
    }
  }

  close() {
    clearInterval(this.heartbeatTimer);
    this.unsubscribe();
  }
}

export const wsHub = new WsHub();
