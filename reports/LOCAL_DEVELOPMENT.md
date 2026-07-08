# ECG Insight Local Development

ECG Insight runs as a local npm project with:

- Backend: Express + TypeScript in `server/src`
- Frontend: Expo Router + React Native in `artifacts/ecg-insight`
- Database: PostgreSQL through Prisma
- Package manager: npm from the repository root

Install dependencies from the repository root only:

```powershell
npm install
```

## Environment

Local development uses `.env.development` when present. Safe local defaults are:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecg_insight
JWT_SECRET=dev-access-bf05c9530d0e5b0cb6261389e7d95e1eda5202327d09cae39d2be38ef3d4a8a6
JWT_REFRESH_SECRET=dev-refresh-938cfdc355358b3b4d1879f159a0252b7b7fe3b08bcb0979d98b8ec4b82d684d
PORT=3002
CLIENT_ORIGIN=http://localhost:8081
EXPO_PUBLIC_API_URL=http://localhost:3002/api
```

The local startup wrappers force `NODE_ENV=development`, `PORT=3002`, and `EXPO_PUBLIC_API_URL=http://localhost:3002/api` so stale terminal variables do not break runtime.

## Database

Start PostgreSQL locally, then run:

```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

The seed creates demo users such as:

- `doctor@ecginsight.com` / `password`
- `admin@ecginsight.com` / `password`
- `super@ecginsight.com` / `password`

## Start Backend

```powershell
npm run dev:api
```

Backend URL:

```text
http://localhost:3002
```

Health endpoints:

```text
http://localhost:3002/health
http://localhost:3002/readiness
http://localhost:3002/api/healthz
```

## Start Frontend

In a second terminal:

```powershell
npm run dev:frontend
```

Frontend URL:

```text
http://localhost:8081
```

For native Expo clients from the frontend folder:

```powershell
cd artifacts/ecg-insight
npm run dev:mobile
```

## Port Conflicts

Expected local ports:

- API: `3002`
- Expo web: `8081`

Check ports on Windows:

```powershell
Get-NetTCPConnection -LocalPort 3002,8081 -ErrorAction SilentlyContinue
```

If a stale Node process owns a port:

```powershell
Stop-Process -Id <OwningProcess> -Force
```

## Validation

Before committing:

```powershell
npm run build
npm run lint
npm run test
```

All three commands must pass with zero TypeScript, lint, and test failures.
