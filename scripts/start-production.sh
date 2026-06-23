#!/bin/sh
set -e

npx prisma migrate deploy
npx tsx server/src/index.ts
