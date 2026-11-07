import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { wsHub } from "../realtime/ws-hub.js";

/** GET /ws — Tech Spec §3 "WebSocket". Token via ?token= query (ws clients can't set headers easily). */
export default fp(
  async function websocketPlugin(app: FastifyInstance) {
    await app.register(websocket);

    app.get("/ws", { websocket: true }, (socket, req) => {
      const token = (req.query as Record<string, string | undefined>).token;
      if (!token) {
        socket.close(4001, "missing token");
        return;
      }

      let userId: string;
      try {
        const decoded = app.jwt.verify<{ sub: string }>(token);
        userId = decoded.sub;
      } catch {
        socket.close(4001, "invalid token");
        return;
      }

      wsHub.add(userId, socket);
    });
  },
  { name: "websocketPlugin", dependencies: ["authPlugin"] },
);
