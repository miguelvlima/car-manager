FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN npx prisma generate && npx next build

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/bootstrap.ts && npx next start --hostname 0.0.0.0 --port 3000"]
