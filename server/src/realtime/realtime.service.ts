import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

export type RealtimeEvent =
  | "ecg.created"
  | "ecg.critical"
  | "report.generated"
  | "notification.created"
  | "notification.count.updated"
  | "notification.updated"
  | "task.assigned"
  | "alert.created";

export function initializeRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      credentials: true,
      origin: true,
    },
  });
  io.on("connection", (socket) => {
    socket.on("join", (room: string) => {
      if (room) socket.join(room);
    });
    socket.on("join:user", (userId: string) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on("join:role", (role: string) => {
      if (role) socket.join(`role:${role}`);
    });
  });
  return io;
}

export function emitRealtime(event: RealtimeEvent, payload: unknown, rooms: string[] = []) {
  if (!io) return;
  if (rooms.length === 0) {
    io.emit(event, payload);
    return;
  }
  for (const room of rooms) {
    io.to(room).emit(event, payload);
  }
}
