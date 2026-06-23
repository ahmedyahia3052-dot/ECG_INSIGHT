import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

export type RealtimeEvent =
  | "ecg.created"
  | "ecg.critical"
  | "report.generated"
  | "notification.created"
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
