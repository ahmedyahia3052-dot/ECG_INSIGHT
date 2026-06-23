# ECG Insight

ECG Insight includes an Expo frontend and a production Sprint 1 Node/Express API backed by PostgreSQL and Prisma.

## Environment Setup

Environment files live at the repository root:

- `.env.example` documents every supported variable.
- `.env.development` contains generated secure local defaults.
- `.env.production` is a deployment template and must be replaced with real production values before running with `NODE_ENV=production`.

The API loads `.env.${NODE_ENV}` first, then `.env` if it exists. If `NODE_ENV` is not set, it defaults to `development`.

## Required Variables

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `JWT_SECRET`: Secret for short-lived JWT access tokens. Use at least 32 random characters.
- `JWT_REFRESH_SECRET`: Separate secret for refresh tokens. Use at least 32 random characters.
- `NODE_ENV`: Runtime mode: `development`, `test`, or `production`.
- `PORT`: API port, defaults to `3001` in development.
- `CLIENT_ORIGIN`: Frontend origin allowed for credentialed API requests.
- `COOKIE_DOMAIN`: Optional domain for HttpOnly refresh-token cookies. Leave empty for localhost.
- `EXPO_PUBLIC_API_URL`: Public API base URL used by the Expo frontend.

## Local Development

The generated `.env.development` is enough for the API to start without additional secrets:

```powershell
npm run dev
```

To use the database-backed auth flows, ensure PostgreSQL is running and the database in `DATABASE_URL` exists, then run:

```powershell
npx prisma migrate dev --name init
npm run db:seed
```

Seeded demo accounts keep the existing UI demo experience:

- `super@ecginsight.com`
- `admin@ecginsight.com`
- `doctor@ecginsight.com`
- `student@ecginsight.com`

All seeded demo passwords are `password`.

## Validation

Environment validation is Zod-based in `server/src/config/env.ts`. Development can start with generated safe defaults. Production startup rejects missing, placeholder, localhost, or too-short values with a clear error listing the invalid variables.

## Verification

Use these commands before shipping changes:

```powershell
npm run build
npm run lint
```
