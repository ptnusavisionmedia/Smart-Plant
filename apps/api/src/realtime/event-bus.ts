import { EventEmitter } from "node:events";
import type { WsServerEvent } from "@smart-plant/shared";

export interface DomainEvents {
  ws: (userId: string, event: WsServerEvent) => void;
}

/**
 * In-process typed event bus (Tech Spec §1 "In-process cache/pub-sub" —
 * single API instance for V1, replaced by Redis pub/sub if scaled out).
 */
class EventBus extends EventEmitter {
  emitToUser(userId: string, event: WsServerEvent) {
    this.emit("ws", userId, event);
  }

  onWsEvent(listener: (userId: string, event: WsServerEvent) => void) {
    this.on("ws", listener);
    return () => this.off("ws", listener);
  }
}

export const eventBus = new EventBus();
eventBus.setMaxListeners(0);
