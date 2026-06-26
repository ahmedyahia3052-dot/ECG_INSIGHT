import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { prisma } from "../config/prisma";
import { verifyAccessToken } from "../utils/jwt";
import { canAccessCase } from "../utils/resource-access";

let io: Server | null = null;

export type RealtimeEvent =
  | "ecg.created"
  | "ecg.critical"
  | "report.generated"
  | "notification.created"
  | "notification.count.updated"
  | "notification.updated"
  | "task.assigned"
  | "alert.created"
  | "case.activity.created"
  | "case.assignment.updated"
  | "case.discussion.message.created"
  | "case.lock.updated"
  | "case.note.created"
  | "case.note.updated"
  | "case.presence.updated"
  | "case.status.updated"
  | "case.version.restored";

export function initializeRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      credentials: true,
      origin: true,
    },
  });
  io.use(async (socket, next) => {
    try {
      const token =
        typeof socket.handshake.auth.token === "string"
          ? socket.handshake.auth.token
          : typeof socket.handshake.headers.authorization === "string"
            ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
            : null;
      if (!token) {
        next(new Error("Authentication required."));
        return;
      }
      const claims = verifyAccessToken(token);
      const session = await prisma.session.findUnique({ include: { user: true }, where: { id: claims.sessionId } });
      if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
        next(new Error("Session is no longer valid."));
        return;
      }
      socket.data.auth = { id: claims.sub, role: claims.role, sessionId: claims.sessionId };
      socket.join(`user:${claims.sub}`);
      socket.join(`role:${claims.role}`);
      next();
    } catch {
      next(new Error("Invalid access token."));
    }
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
    socket.on("join:case", async (caseId: string, ack?: (payload: { joined: boolean; room?: string; error?: string }) => void) => {
      try {
        if (!caseId || !socket.data.auth) {
          ack?.({ error: "Case ID is required.", joined: false });
          return;
        }
        const ecgCase = await prisma.eCGCase.findFirst({
          select: { id: true },
          where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
        });
        if (!ecgCase || !(await canAccessCase(ecgCase.id, socket.data.auth))) {
          ack?.({ error: "You do not have access to this case.", joined: false });
          return;
        }
        const room = `case:${ecgCase.id}`;
        socket.join(room);
        ack?.({ joined: true, room });
      } catch {
        ack?.({ error: "Unable to join case room.", joined: false });
      }
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
