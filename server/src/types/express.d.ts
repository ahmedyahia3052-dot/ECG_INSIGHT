import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthUser {
      actorId?: string;
      actorRole?: Role;
      id: string;
      role: Role;
      sessionId: string;
    }

    interface Request {
      auth?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
