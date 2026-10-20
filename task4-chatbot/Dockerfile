# Task 4 — CloudHelp Chatbot Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Environment defaults
ENV NODE_ENV=production \
    TASK4_PORT=3004

# Expose service port
EXPOSE 3004

# Container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3004/api/health || exit 1

# Start service
CMD ["node", "src/server.js"]
