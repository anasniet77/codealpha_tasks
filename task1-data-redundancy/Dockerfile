# Task 1 — Data Redundancy Removal System Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Environment defaults
ENV NODE_ENV=production \
    TASK1_PORT=3001 \
    TASK1_DB_PATH=/app/data/redundancy.db

# Expose service port
EXPOSE 3001

# Container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start service
CMD ["node", "src/server.js"]
