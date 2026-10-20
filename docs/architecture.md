# System Architecture & Cloud Design

This document details the architecture, design choices, and cloud readiness of the CodeAlpha Cloud Computing Internship implementations.

---

## 1. High-Level Architecture Overview

The repository implements three distinct, production-grade cloud services designed under a modular microservices architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browsers & API)                   │
└───────────────┬────────────────────────┬───────────────────────┬───────┘
                │                        │                       │
         Port 3001 (HTTP)         Port 3003 (HTTP)        Port 3004 (HTTP)
                ▼                        ▼                       ▼
┌────────────────────────┐┌────────────────────────┐┌────────────────────┐
│ Task 1: Deduplication  ││ Task 3: Bus Pass System││ Task 4: Chatbot    │
│ - Dedup Classification ││ - JWT Auth & RBAC      ││ - NLP Tokenizer    │
│ - Composite Scoring    ││ - Idempotent Payments  ││ - Intent Matcher   │
│ - Audit Logging        ││ - Server Price Valid.  ││ - AI Fallback Hook │
└───────────┬────────────┘└───────────┬────────────┘└──────────┬─────────┘
            │                         │                        │
            ▼                         ▼                        ▼
┌────────────────────────┐┌────────────────────────┐┌────────────────────┐
│ SQLite WAL Database    ││ SQLite WAL Database    ││ Knowledge Base &   │
│ (Unique Constraints)   ││ (ACID Transactions)    ││ Optional OpenAI API│
└────────────────────────┘└────────────────────────┘└────────────────────┘
```

---

## 2. Core Architectural Principles

### 2.1 Decoupled Microservices
Each task operates as an independent, self-contained service with its own:
- Dedicated process and HTTP server port (3001, 3003, 3004)
- Isolated persistent database schema
- Independent dependencies, test suites, and Docker container definitions
- Distinct API endpoints and health checks (`/api/health`)

### 2.2 Resilient Data Layer
- **ACID Compliance**: All financial transactions and pass generation operations (Task 3) execute within atomic database transactions with automatic rollback on errors.
- **Constraints at Database Level**: Hard unique constraints on user emails, pass numbers, and transaction IDs prevent database-level race conditions and accidental data corruption.
- **Write-Ahead Logging (WAL)**: Both database instances utilize SQLite WAL mode, allowing concurrent reads without blocking writes.

### 2.3 Cloud Readiness & Scalability
- **Stateless Application Servers**: Authentication in Task 3 uses stateless JSON Web Tokens (JWT) with HMAC-SHA256 signing, eliminating session affinity requirements on load balancers.
- **Containerized Deployment**: Each service includes an optimized Alpine Linux Dockerfile with container health check hooks.
- **Unified Orchestration**: A root `docker-compose.yml` configures ports, restart policies, and named persistent volumes for cloud deployments (e.g., AWS ECS, Azure Container Apps, GCP Cloud Run).
- **Environment Isolation**: All configuration (ports, database paths, secrets, API keys) is injected via standard POSIX environment variables.

---

## 3. Technology Stack Selection Justification

| Layer | Technology | Justification |
|---|---|---|
| Runtime | Node.js (v20+) | High concurrency I/O, lightweight memory footprint, native SQLite engine support. |
| Web Framework | Express.js | Industry standard, predictable HTTP middleware routing, minimal overhead. |
| Database | SQLite (`node:sqlite` / WAL) | Zero external server dependency for local evaluation while preserving strict ACID guarantees and foreign keys. |
| Security | `bcryptjs` + `jsonwebtoken` | Pure JavaScript implementations providing constant-time password hashing and cryptographically signed bearer tokens. |
| Container | Docker & Docker Compose | Uniform runtime across development and multi-cloud production targets. |
| UI/Frontend | Vanilla HTML5 / Modern CSS | Zero build tool dependencies, ultra-fast load times, glassmorphism dark-mode aesthetics. |
