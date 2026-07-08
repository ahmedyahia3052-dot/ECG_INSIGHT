import { describe, expect, it } from "vitest";
import {
  issueAccessToken,
  issueRefreshToken,
  parseRefreshToken,
} from "../../../../server/src/modules/authentication/service/token.service";

describe("authentication token service", () => {
  it("issues and parses refresh tokens with token version", () => {
    const token = issueRefreshToken({
      expiresInSeconds: 3600,
      sessionId: "session-123",
      tokenVersion: 2,
      userId: "user-123",
    });
    const claims = parseRefreshToken(token);
    expect(claims.sessionId).toBe("session-123");
    expect(claims.tokenVersion).toBe(2);
    expect(claims.sub).toBe("user-123");
  });

  it("issues access tokens with role and session claims", () => {
    const token = issueAccessToken({
      role: "DOCTOR",
      sessionId: "session-abc",
      userId: "user-abc",
    });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});
