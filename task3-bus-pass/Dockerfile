# Task 3 — Cloud-Based Bus Pass System Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Environment defaults
ENV NODE_ENV=production \
    TASK3_PORT=3003 \
    TASK3_DB_PATH=/app/data/buspass.db \
    TASK3_JWT_SECRET=production-secret-change-in-env

# Expose service port
EXPOSE 3003

# Container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/api/health || exit 1

# Start service
CMD ["node", "src/server.js"]
