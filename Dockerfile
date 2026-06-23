FROM node:22-alpine AS base

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "scripts/start-production.sh"]
