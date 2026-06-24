#!/bin/sh
set -e

npm run validate:production
npx prisma migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  npm run db:seed
fi

npx tsx server/src/index.ts
