export interface MobileSession {
  accessToken: string;
  expiresAt: string;
  userId: string;
}

export interface MobileSessionStore {
  clear(): Promise<void>;
  get(): Promise<MobileSession | null>;
  set(session: MobileSession): Promise<void>;
}
