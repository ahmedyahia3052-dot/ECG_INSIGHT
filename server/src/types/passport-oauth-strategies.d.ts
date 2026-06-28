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
