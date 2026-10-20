# Cloud Deployment & Production Guide

This guide describes how to configure, containerize, and deploy the CodeAlpha Cloud Computing applications to modern cloud providers.

---

## 1. Cloud Architecture & Target Platforms

The microservices architecture is designed to deploy on any major containerized cloud platform:

| Platform | Recommended Service | Why Compatible |
|---|---|---|
| **Amazon Web Services (AWS)** | AWS App Runner / ECS Fargate | Serverless container execution; automatically handles TLS, zero-downtime rollouts, and auto-scaling based on HTTP concurrency. |
| **Microsoft Azure** | Azure Container Apps | Kubernetes-powered serverless containers with built-in ingress, custom domains, and integrated Azure Key Vault secret management. |
| **Google Cloud Platform (GCP)**| Cloud Run | Scale-to-zero container hosting with pay-per-use billing and automatic HTTPS endpoints. |
| **PaaS (Heroku / Render / Railway)** | Web Services | Native Dockerfile detection with automated Git-push deployments. |

---

## 2. Docker & Local Production Orchestration

All three services can be built and launched simultaneously using Docker Compose:

```bash
# Build images and start containers in the background
docker compose up --build -d

# Check running containers
docker compose ps

# View aggregate logs
docker compose logs -f

# Shut down containers while preserving persistent volumes
docker compose down
```

### Port Mappings
- **Task 1 (Data Redundancy Removal)**: `http://localhost:3001`
- **Task 3 (Cloud-Based Bus Pass System)**: `http://localhost:3003`
- **Task 4 (CloudHelp Chatbot)**: `http://localhost:3004`

---

## 3. Environment Variable Configuration

Copy `.env.example` to `.env` in production:

```ini
# Task 1
TASK1_PORT=3001
TASK1_DB_PATH=/app/data/redundancy.db

# Task 3
TASK3_PORT=3003
TASK3_DB_PATH=/app/data/buspass.db
TASK3_JWT_SECRET=use-a-strong-256-bit-cryptographic-random-secret
TASK3_SESSION_SECRET=use-another-strong-cryptographic-random-secret

# Task 4
TASK4_PORT=3004
# Optional: Set your OpenAI key for generative AI responses
OPENAI_API_KEY=sk-...
```

---

## 4. Cloud Migration & Horizontal Scaling Strategy

For enterprise-scale cloud deployments:
1. **Database Decoupling**: Transition SQLite file storage to AWS Aurora Serverless (PostgreSQL/MySQL), Azure Database for PostgreSQL, or Google Cloud SQL by replacing the database driver module with PostgreSQL/MySQL drivers (`pg` or `mysql2`).
2. **Stateless Scale-Out**: Because Task 3 uses stateless JWT tokens, backend container instances can scale from 1 to 50+ instances behind an Application Load Balancer without session synchronization issues.
3. **Static Asset Offloading**: Serve frontend static files (`/public`) through Amazon CloudFront CDN or Cloudflare connected to an S3/Blob storage bucket to minimize compute load.
4. **Health Check Probing**:
   - Task 1: `GET http://localhost:3001/api/health`
   - Task 3: `GET http://localhost:3003/api/health`
   - Task 4: `GET http://localhost:3004/api/health`
