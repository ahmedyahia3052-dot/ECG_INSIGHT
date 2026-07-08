import { describe, expect, it } from "vitest";
import { AppError } from "../../../../server/src/middleware/error";
import {
  assertPasswordPolicy,
  hashNewPassword,
  verifyPassword,
} from "../../../../server/src/modules/authentication/service/password.service";

describe("authentication password service", () => {
  it("rejects weak passwords", () => {
    expect(() => assertPasswordPolicy("short")).toThrow(AppError);
  });

  it("hashes passwords with argon2 by default", async () => {
    const hash = await hashNewPassword("StrongPass123!");
    expect(hash.startsWith("$argon2")).toBe(true);
    expect(await verifyPassword("StrongPass123!", hash)).toBe(true);
    expect(await verifyPassword("WrongPass123!", hash)).toBe(false);
  });
});
