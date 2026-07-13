import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";

import { env } from "../config/env";
import { AppError } from "../middleware/error";
import { oauthLogin } from "./auth.service";
import {
  ALL_OAUTH_PROVIDERS,
  callbackBaseUrl,
  resolveProviderConfig,
  type OAuthProvider,
  type ProviderRuntimeConfig,
} from "./auth-provider-config.service";
import { oauthStateStore } from "./oauth-state-store";

export type { OAuthProvider };

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

const registered = new Set<string>();

function providerDisplayName(provider: OAuthProvider) {
  switch (provider) {
    case "GOOGLE":
      return "Google";
    case "APPLE":
      return "Apple";
    case "MICROSOFT":
      return "Microsoft";
    case "FACEBOOK":
      return "Facebook";
    case "LINKEDIN":
      return "LinkedIn";
    default:
      return "OAuth";
  }
}

function nameFromProfile(profile: OAuthProfile, fallbackEmail?: string, provider: OAuthProvider = "GOOGLE") {
  const fullName = [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ").trim();
  return profile.displayName || fullName || fallbackEmail?.split("@")[0] || `${providerDisplayName(provider)} User`;
}

function userFromProfile(provider: OAuthProvider, profile: OAuthProfile): OAuthUser {
  const email = profile.emails?.find((item) => item.value)?.value;
  return {
    email,
    name: nameFromProfile(profile, email, provider),
    provider,
    providerUserId: profile.id ?? email ?? "",
  };
}

function doneWithProfile(provider: OAuthProvider, profile: OAuthProfile, done: VerifyCallback) {
  const user = userFromProfile(provider, profile);
  if (!user.providerUserId) {
    done(new Error(`${providerDisplayName(provider)} profile did not include a stable user identifier.`));
    return;
  }
  done(null, user);
}

function strategyOptions(config: ProviderRuntimeConfig) {
  const callbackURL = config.redirectUri ?? `${callbackBaseUrl()}/auth/${config.provider.toLowerCase()}/callback`;
  const base = {
    callbackURL,
    passReqToCallback: false as const,
    // CSRF state + PKCE (durable store; works without express-session)
    state: true,
    store: oauthStateStore,
    pkce: true,
  };
  return { ...base, callbackURL };
}

function registerStrategy(config: ProviderRuntimeConfig) {
  const name = config.provider.toLowerCase();
  if (registered.has(name)) {
    try {
      passport.unuse(name);
    } catch {
      /* ignore */
    }
    registered.delete(name);
  }

  const opts = strategyOptions(config);

  if (config.provider === "GOOGLE") {
    passport.use(
      name,
      new GoogleStrategy(
        {
          ...opts,
          clientID: config.clientId!,
          clientSecret: config.clientSecret!,
        },
        (_accessToken, _refreshToken, profile, done) => doneWithProfile("GOOGLE", profile as OAuthProfile, done),
      ),
    );
  } else if (config.provider === "APPLE") {
    passport.use(
      name,
      new AppleStrategy(
        {
          ...opts,
          clientID: config.clientId,
          keyID: config.appleKeyId,
          privateKeyString: config.applePrivateKey,
          scope: config.scopes,
          teamID: config.appleTeamId,
        },
        (...args: unknown[]) => {
          const done = args[args.length - 1] as VerifyCallback;
          const profile = (args[args.length - 2] ?? {}) as OAuthProfile;
          doneWithProfile("APPLE", profile, done);
        },
      ),
    );
  } else if (config.provider === "MICROSOFT") {
    passport.use(
      name,
      new MicrosoftStrategy(
        {
          ...opts,
          clientID: config.clientId,
          clientSecret: config.clientSecret,
          scope: config.scopes,
        },
        (...args: unknown[]) => {
          const done = args[args.length - 1] as VerifyCallback;
          const profile = (args[args.length - 2] ?? {}) as OAuthProfile;
          doneWithProfile("MICROSOFT", profile, done);
        },
      ),
    );
  } else if (config.provider === "FACEBOOK") {
    passport.use(
      name,
      new FacebookStrategy(
        {
          ...opts,
          clientID: config.clientId!,
          clientSecret: config.clientSecret!,
          profileFields: ["id", "emails", "name", "displayName"],
          enableProof: true,
        },
        (_accessToken, _refreshToken, profile, done) => doneWithProfile("FACEBOOK", profile as OAuthProfile, done),
      ),
    );
  } else if (config.provider === "LINKEDIN") {
    passport.use(
      name,
      new LinkedInStrategy(
        {
          ...opts,
          clientID: config.clientId!,
          clientSecret: config.clientSecret!,
          scope: config.scopes,
        },
        (_accessToken: string, _refreshToken: string, profile: OAuthProfile, done: VerifyCallback) =>
          doneWithProfile("LINKEDIN", profile, done),
      ),
    );
  }

  registered.add(name);
}

export async function reconfigureOAuthPassport() {
  for (const provider of ALL_OAUTH_PROVIDERS) {
    const config = await resolveProviderConfig(provider);
    if (config.enabled) registerStrategy(config);
  }
}

export function configureOAuthPassport() {
  // Sync boot: register env-backed providers immediately; DB providers load async.
  void reconfigureOAuthPassport();
}

export async function oauthProviderStatuses() {
  const providers = [];
  for (const provider of ALL_OAUTH_PROVIDERS) {
    const config = await resolveProviderConfig(provider);
    providers.push({ configured: config.enabled, provider, source: config.source });
  }
  return providers;
}

export function startOAuth(provider: OAuthProvider) {
  const strategy = provider.toLowerCase();
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await resolveProviderConfig(provider);
      if (!config.enabled) {
        throw new AppError(503, "OAuth provider not configured by administrator", "OAUTH_PROVIDER_NOT_CONFIGURED");
      }
      registerStrategy(config);
      passport.authenticate(strategy, {
        scope: config.scopes,
        session: false,
        state: true,
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function spaOrigin() {
  return env.CLIENT_ORIGIN.split(",")[0].replace(/\/+$/, "");
}

export function completeOAuth(provider: OAuthProvider) {
  const strategy = provider.toLowerCase();
  return [
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const config = await resolveProviderConfig(provider);
        if (!config.enabled) {
          throw new AppError(503, "OAuth provider not configured by administrator", "OAUTH_PROVIDER_NOT_CONFIGURED");
        }
        registerStrategy(config);
        passport.authenticate(strategy, {
          failureRedirect: `${spaOrigin()}/auth/login?oauth=failed`,
          session: false,
        })(req, res, next);
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
        res.redirect(`${spaOrigin()}/auth/oauth/callback`);
      } catch (error) {
        next(error);
      }
    },
  ] as const;
}

/** Sync helper for tests / legacy callers */
export function configured(provider: OAuthProvider) {
  // Env-only sync check; prefer resolveProviderConfig in async paths.
  return Boolean(
    (provider === "GOOGLE" && env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) ||
      (provider === "APPLE" &&
        env.APPLE_OAUTH_CLIENT_ID &&
        env.APPLE_OAUTH_TEAM_ID &&
        env.APPLE_OAUTH_KEY_ID &&
        env.APPLE_OAUTH_PRIVATE_KEY) ||
      (provider === "MICROSOFT" && env.MICROSOFT_OAUTH_CLIENT_ID && env.MICROSOFT_OAUTH_CLIENT_SECRET) ||
      (provider === "FACEBOOK" && env.FACEBOOK_OAUTH_CLIENT_ID && env.FACEBOOK_OAUTH_CLIENT_SECRET) ||
      (provider === "LINKEDIN" && env.LINKEDIN_OAUTH_CLIENT_ID && env.LINKEDIN_OAUTH_CLIENT_SECRET),
  );
}
