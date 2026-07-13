# BelatedElasticLoop — Login Auth Configuration

Complete setup for Google, Apple, Microsoft, Facebook, LinkedIn, WebAuthn/passkeys, and MFA challenge.

## Apply database migration

```bash
cd BelatedElasticLoop
npx prisma migrate deploy
# or during development:
npx prisma db push
```

Migration: `prisma/migrations/20260713180000_login_oauth_webauthn/`

Adds:
- `OAuthProvider.FACEBOOK`, `OAuthProvider.LINKEDIN`
- `WebAuthnCredential`, `WebAuthnChallenge` tables

## Environment variables

Copy into `.env` / `.env.development` (also documented in `.env.example`):

```env
OAUTH_CALLBACK_BASE_URL=http://localhost:3002/api

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

APPLE_OAUTH_CLIENT_ID=
APPLE_OAUTH_TEAM_ID=
APPLE_OAUTH_KEY_ID=
APPLE_OAUTH_PRIVATE_KEY=

MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=

FACEBOOK_OAUTH_CLIENT_ID=
FACEBOOK_OAUTH_CLIENT_SECRET=

LINKEDIN_OAUTH_CLIENT_ID=
LINKEDIN_OAUTH_CLIENT_SECRET=

WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=ECG Insight
WEBAUTHN_ORIGIN=http://localhost:5000
```

Blank OAuth client IDs keep the provider **visible but disabled** on the Login screen (`GET /api/auth/oauth/providers` → `configured: false`).

## Provider console setup

### Google
1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
2. Authorized redirect URI: `http://localhost:3002/api/auth/google/callback`
3. Production: `https://<api-host>/api/auth/google/callback`

### Apple
1. Apple Developer → Identifiers → Services ID
2. Return URL: `http://localhost:3002/api/auth/apple/callback`
3. Set Team ID, Key ID, and PEM private key (`APPLE_OAUTH_PRIVATE_KEY`, newlines as `\n`)

### Microsoft
1. Azure Portal → App registrations → New registration
2. Redirect URI (Web): `http://localhost:3002/api/auth/microsoft/callback`
3. Create a client secret

### Facebook
1. Meta for Developers → App → Facebook Login
2. Valid OAuth Redirect URI: `http://localhost:3002/api/auth/facebook/callback`
3. Permissions: `email`, `public_profile`

### LinkedIn
1. LinkedIn Developers → Auth
2. Redirect URL: `http://localhost:3002/api/auth/linkedin/callback`
3. Products: Sign In with LinkedIn (r_liteprofile, r_emailaddress)

## WebAuthn / Passkeys

1. Set `WEBAUTHN_RP_ID` to the site’s registrable domain (`localhost` for local, `app.example.com` in prod)
2. Set `WEBAUTHN_ORIGIN` to the exact SPA origin (e.g. `http://localhost:5000`)
3. Restart API
4. `GET /api/auth/webauthn/status` → `{ available: true }`
5. Register a passkey while signed in: `POST /api/auth/webauthn/register/options` → browser `navigator.credentials.create` → `POST /api/auth/webauthn/register/verify`
6. Login screen Face ID / Touch ID uses `POST /api/auth/webauthn/login/options` + `verify`

## MFA challenge at login

1. User enrolls TOTP/EMAIL_OTP via `/api/security/mfa` (authenticated)
2. Next password login returns:
   ```json
   { "code": "MFA_REQUIRED", "mfaRequired": true, "mfaToken": "...", "methods": ["TOTP"] }
   ```
3. Client submits `POST /api/auth/mfa/verify` with `{ mfaToken, code }` → JWT session

## New API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/oauth/facebook` | Start Facebook OAuth |
| GET | `/auth/oauth/linkedin` | Start LinkedIn OAuth |
| POST | `/auth/mfa/verify` | Complete MFA login challenge |
| GET | `/auth/webauthn/status` | Passkey availability |
| POST | `/auth/webauthn/register/options` | Registration challenge |
| POST | `/auth/webauthn/register/verify` | Store credential |
| POST | `/auth/webauthn/login/options` | Assertion challenge |
| POST | `/auth/webauthn/login/verify` | Passkey login → JWT |
| GET | `/auth/webauthn/credentials` | List credentials |
| DELETE | `/auth/webauthn/credentials/:id` | Remove credential |

OAuth callback redirects to `{CLIENT_ORIGIN}/auth/oauth/callback`.
