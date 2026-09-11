# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Firebase's public web key is compiled into the client; never pass server secrets.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
RUN test -n "$NEXT_PUBLIC_FIREBASE_API_KEY"
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
