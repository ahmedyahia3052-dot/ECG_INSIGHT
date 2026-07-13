declare module "passport-apple" {
  import type { Strategy as PassportStrategy } from "passport";

  export class Strategy extends PassportStrategy {
    constructor(options: Record<string, unknown>, verify: (...args: unknown[]) => void);
  }
}

declare module "passport-microsoft" {
  import type { Strategy as PassportStrategy } from "passport";

  export class Strategy extends PassportStrategy {
    constructor(options: Record<string, unknown>, verify: (...args: unknown[]) => void);
  }
}

declare module "passport-facebook" {
  import type { Strategy as PassportStrategy } from "passport";

  export class Strategy extends PassportStrategy {
    constructor(
      options: Record<string, unknown>,
      verify: (accessToken: string, refreshToken: string, profile: unknown, done: (error: Error | null, user?: unknown) => void) => void,
    );
  }
}

declare module "passport-linkedin-oauth2" {
  import type { Strategy as PassportStrategy } from "passport";

  export class Strategy extends PassportStrategy {
    constructor(
      options: Record<string, unknown>,
      verify: (accessToken: string, refreshToken: string, profile: unknown, done: (error: Error | null, user?: unknown) => void) => void,
    );
  }
}
