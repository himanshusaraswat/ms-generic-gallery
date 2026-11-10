# Multi-stage production build for Fastify backend microservice
# Stage 1: Build TypeScript artifacts
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN npm run build:ts

# Stage 2: Minimal production runtime (~60MB)
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Non-root user for security best practices
USER node

EXPOSE 3000

CMD ["node", "dist/app.js"]
