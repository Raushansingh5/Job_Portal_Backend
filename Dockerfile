# Stage 1 — Build
FROM node:20-slim AS builder

WORKDIR /usr/src/app

COPY package*.json .
RUN npm ci --omit=dev

COPY . .

# Stage 2 — Production container
FROM node:20-slim

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app .

ENV NODE_ENV=production

EXPOSE 6000

CMD ["node", "src/server.js"]
