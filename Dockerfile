# API TuaoBet — build a partir da raiz do monorepo (Render Docker)
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY tuaobet-backend/package.json tuaobet-backend/package-lock.json* ./
COPY tuaobet-backend/prisma ./prisma/

RUN npm ci --include=dev

COPY tuaobet-backend/ .

RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
