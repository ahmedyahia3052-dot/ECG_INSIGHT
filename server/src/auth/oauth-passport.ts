import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";

import { env } from "../config/env";
import { AppError } from "../middleware/error";
import { oauthLogin } from "./auth.service";

type OAuthProvider = "APPLE" | "GOOGLE" | "MICROSOFT";

type OAuthProfile = {
  displayName?: string;
  emails?: Array<{ value?: string }>;
  id?: string;
  name?: { familyName?: string; givenName?: string };
};

type OAuthUser = {
  email?: string;
  name?: string;
  provider: OAuthProvider;
  providerUserId: string;
};

type VerifyCallback = (error: Error | null, user?: OAuthUser) => void;
function callbackBaseUrl() {
  const configured = env.OAUTH_CALLBACK_BASE_URL ?? env.EXPO_PUBLIC_API_URL;
  return configured.replace(/\/+$/, "").replace(/\/api(?:\/v\d+)?$/i, "/api");
}

function providerDisplayName(provider: OAuthProvider) {
  if (provider === "GOOGLE") return "Google";
  if (provider === "APPLE") return "Apple";
  return "Microsoft";
}

function nameFromProfile(profile: OAuthProfile, fallbackEmail?: string) {
  const fullName = [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ").trim();
  return profile.displayName || fullName || fallbackEmail?.split("@")[0] || `${providerDisplayName("GOOGLE")} User`;
}

function userFromProfile(provider: OAuthProvider, profile: OAuthProfile): OAuthUser {
  const email = profile.emails?.find((item) => item.value)?.value;
  return {
    email,
    name: nameFromProfile(profile, email),
    provider,
    providerUserId: profile.id ?? email ?? "",
  };
}

function configured(provider: OAuthProvider) {
  if (provider === "GOOGLE") return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
  if (provider === "APPLE") return Boolean(env.APPLE_OAUTH_CLIENT_ID && env.APPLE_OAUTH_TEAM_ID && env.APPLE_OAUTH_KEY_ID && env.APPLE_OAUTH_PRIVATE_KEY);
  return Boolean(env.MICROSOFT_OAUTH_CLIENT_ID && env.MICROSOFT_OAUTH_CLIENT_SECRET);
}

export function oauthProviderStatuses() {
  return (["GOOGLE", "APPLE", "MICROSOFT"] as OAuthProvider[]).map((provider) => ({
    configured: configured(provider),
    provider,
  }));
}

function assertConfigured(provider: OAuthProvider) {
  if (!configured(provider)) {
    throw new AppError(503, "OAuth provider not configured by administrator", "OAUTH_PROVIDER_NOT_CONFIGURED");
  }
}

function doneWithProfile(provider: OAuthProvider, profile: OAuthProfile, done: VerifyCallback) {
  const user = userFromProfile(provider, profile);
  if (!user.providerUserId) {
    done(new Error(`${providerDisplayName(provider)} profile did not include a stable user identifier.`));
    return;
  }
  done(null, user);
}

let configuredPassport = false;

export function configureOAuthPassport() {
  if (configuredPassport) return;
  configuredPassport = true;

  if (configured("GOOGLE")) {
    passport.use(
      "google",
      new GoogleStrategy(
        {
          callbackURL: `${callbackBaseUrl()}/auth/google/callback`,
          clientID: env.GOOGLE_OAUTH_CLIENT_ID!,
          clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
        },
        (_accessToken, _refreshToken, profile, done) => doneWithProfile("GOOGLE", profile as OAuthProfile, done),
      ),
    );
  }

  if (configured("APPLE")) {
    passport.use(
      "apple",
      new AppleStrategy(
        {
          callbackURL: `${callbackBaseUrl()}/auth/apple/callback`,
          clientID: env.APPLE_OAUTH_CLIENT_ID,
          keyID: env.APPLE_OAUTH_KEY_ID,
          privateKeyString: env.APPLE_OAUTH_PRIVATE_KEY,
          scope: ["name", "email"],
          teamID: env.APPLE_OAUTH_TEAM_ID,
        },
        (...args: unknown[]) => {
          const done = args[args.length - 1] as VerifyCallback;
          const profile = (args[args.length - 2] ?? {}) as OAuthProfile;
          doneWithProfile("APPLE", profile, done);
        },
      ),
    );
  }

  if (configured("MICROSOFT")) {
    passport.use(
      "microsoft",
      new MicrosoftStrategy(
        {
          callbackURL: `${callbackBaseUrl()}/auth/microsoft/callback`,
          clientID: env.MICROSOFT_OAUTH_CLIENT_ID,
          clientSecret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
          scope: ["user.read"],
        },
        (...args: unknown[]) => {
          const done = args[args.length - 1] as VerifyCallback;
          const profile = (args[args.length - 2] ?? {}) as OAuthProfile;
          doneWithProfile("MICROSOFT", profile, done);
        },
      ),
    );
  }
}

export function startOAuth(provider: OAuthProvider) {
  const strategy = provider.toLowerCase();
  const scope = provider === "GOOGLE" ? ["profile", "email"] : provider === "APPLE" ? ["name", "email"] : ["user.read"];
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      assertConfigured(provider);
      passport.authenticate(strategy, { scope, session: false })(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function completeOAuth(provider: OAuthProvider) {
  const strategy = provider.toLowerCase();
  return [
    (req: Request, res: Response, next: NextFunction) => {
      try {
        assertConfigured(provider);
        passport.authenticate(strategy, { failureRedirect: "/login?oauth=failed", session: false })(req, res, next);
      } catch (error) {
        next(error);
      }
    },
    async (req: Request, res: Response, next: NextFunction) => {
      const oauthUser = req.user as OAuthUser | undefined;
      if (!oauthUser) {
        next(new AppError(401, "OAuth authentication failed.", "OAUTH_FAILED"));
        return;
      }
      try {
        await oauthLogin({ ...oauthUser, rememberMe: true }, req, res);
        res.redirect(`${env.CLIENT_ORIGIN.split(",")[0].replace(/\/+$/, "")}/dashboard`);
      } catch (error) {
        next(error);
      }
    },
  ] as const;
}
