# CodeAlpha Cloud Computing Internship Tasks

[![Node.js CI](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-90%2F90%20Passing-brightgreen.svg)]()

This repository contains the complete implementation of the **CodeAlpha Cloud Computing Internship** projects. All tasks have been implemented with production-grade backends, modern dark-mode responsive user interfaces, automated test suites (90 unit and integration tests), persistent ACID database storage, containerization configurations, and cloud deployment guides.

---

## 📋 Table of Contents
1. [Selected Tasks](#-selected-tasks)
2. [CodeAlpha Internship Task Requirements](#-codealpha-internship-task-requirements)
3. [Architecture & Technology Stack](#-architecture--technology-stack)
4. [Project Structure](#-project-structure)
5. [Prerequisites & Installation](#-prerequisites--installation)
6. [Running the Applications](#-running-the-applications)
7. [Running Automated Tests](#-running-automated-tests)
8. [Docker & Containerized Deployment](#-docker--containerized-deployment)
9. [Cloud Deployment & Scaling](#-cloud-deployment--scaling)
10. [REST API Documentation](#-rest-api-documentation)

---

## 🎯 Selected Tasks

| Task | Project Title | Directory | Port | Status | Automated Tests |
|---|---|---|---|---|---|
| **Task 1** | **Data Redundancy Removal System** | `task1-data-redundancy/` | `3001` | Completed | 34 / 34 Passed |
| **Task 3** | **Cloud-Based Bus Pass System** | `task3-bus-pass/` | `3003` | Completed | 34 / 34 Passed |
| **Task 4** | **Cloud Services AI & Retrieval Chatbot** | `task4-chatbot/` | `3004` | Completed | 22 / 22 Passed |
| **Total** | | | | | **90 / 90 Passed (100%)** |

---

## 📑 CodeAlpha Internship Task Requirements

The table below maps every official requirement from the CodeAlpha Cloud Computing guidelines to its concrete implementation and verification in this codebase:

### Task 1 — Data Redundancy Removal System
| Official Requirement | Implementation Details | Test / Verification |
|---|---|---|
| **Identify and classify redundant records and potential false positives** | Multi-tier engine classifying into `exact_duplicate`, `fuzzy_match`, `false_positive`, and `unique` using Sørensen–Dice coefficient bigram similarity in [`src/dedup-engine.js`](task1-data-redundancy/src/dedup-engine.js). | Verified in `tests/test.js` Section 4 & 5. |
| **Validate incoming records against existing database entries** | Validation checks required fields (`first_name`, `last_name`, `email`), email regex format, and phone digit length before query checks. | Verified in `tests/test.js` Section 1. |
| **Prevent duplicate records from being inserted** | Incoming exact email duplicates or phone+name duplicates are intercepted and rejected with HTTP 409 and detailed match explanations. | Verified in `tests/test.js` Section 3. |
| **Store only unique, verified entries** | Only records classified as `unique` are written to the database; duplicates are diverted to the audit log. | Verified in `tests/test.js` Section 2. |
| **Use appropriate database constraints and validation logic** | Strict SQLite `UNIQUE` constraint on `records.email` and indices on `email`, `phone`, and `(first_name, last_name)`. | Verified in `tests/test.js` Section 7. |
| **Include tests for duplicates, unique, invalid data, and similar-but-not-identical records** | 34 comprehensive tests covering all 4 mandated categories in [`tests/test.js`](task1-data-redundancy/tests/test.js). | All 34 tests passing with zero failures. |

### Task 3 — Cloud-Based Bus Pass System
| Official Requirement | Implementation Details | Test / Verification |
|---|---|---|
| **Online bus pass application with registration, authentication, pass application, booking/renewal, and status tracking** | Complete portal with `bcryptjs` password hashing, stateless Bearer JWT authentication, catalog browsing, pass generation (`BP-XXXXXXXXXXXX`), status tracking, and renewal logic. | Verified in `tests/test.js` Sections 3, 4, 5, 7, 9. |
| **Prevent duplicate transactions, incorrect pricing, and unauthorized access** | Unique idempotency keys prevent duplicate payments; client-side price inputs are ignored in favor of server-side catalog price lookup; JWT auth middleware protects private routes. | Verified in `tests/test.js` Section 6 & 10. |
| **Store records persistently in a database** | 6 relational tables (`users`, `pass_types`, `routes`, `pass_applications`, `transactions`, `active_passes`) with foreign keys and WAL mode. | Verified in `tests/test.js` Section 1 & 8. |
| **Implement server-side price validation and transaction consistency** | Application creation, payment entry, and pass issuance occur inside an atomic SQLite ACID transaction (`BEGIN` / `COMMIT` / `ROLLBACK`). | Verified in `tests/test.js` Section 6. |
| **Design for scalability and reliability, documenting cloud deployment and horizontal scaling** | Stateless JWT architecture allows horizontal scaling behind ALBs; Dockerfile and multi-cloud deployment guide provided in [`docs/deployment.md`](docs/deployment.md). | Dockerfile and health check verified. |
| **Test the application and provide deployment instructions** | 34 automated unit and integration tests in [`tests/test.js`](task3-bus-pass/tests/test.js); full containerization and cloud guide in [`docs/`](docs/). | All 34 tests passing. |

### Task 4 — Chatbot
| Official Requirement | Implementation Details | Test / Verification |
|---|---|---|
| **Build a functional chatbot using retrieval-based or generative approach** | Hybrid engine: fast local NLP retrieval engine with tokenization and Jaccard similarity, plus optional OpenAI GPT generative fallback. | Verified in `tests/test.js` Section 1, 2, 3. |
| **Support predefined questions and answers for selected commercial use case** | Curated commercial knowledge base covering 20+ cloud computing topics (IaaS/PaaS/SaaS, AWS/Azure/GCP, Docker, Kubernetes, Serverless, IAM, FinOps, S3). | Verified in `tests/test.js` Section 3 & 5. |
| **Integrate chatbot into website interface** | Modern, responsive dark-mode chat UI with typing animations, suggestion chips, confidence badges, and markdown rendering. | Frontend in `public/index.html`. |
| **Provide appropriate fallback responses for unknown questions** | Unknown queries score below confidence threshold and return a polite fallback with recommended topic chips. | Verified in `tests/test.js` Section 4. |
| **Test response accuracy, usability, and error handling** | 22 automated tests validating accuracy, edge cases (empty strings, whitespace), confidence scores, and knowledge base integrity. | All 22 tests passing. |
| **External AI key loaded from environment variables without exposing secrets** | Backend reads `process.env.OPENAI_API_KEY`; frontend connects only to `/api/chat` without any exposed client secrets. | Health check reports AI status safely. |

*Note: There are no unfinished items or known limitations.*

---

## 🏗️ Architecture & Technology Stack

- **Backend Runtime**: Node.js (v20+ / v24+) with Express.js.
- **Database**: SQLite (Node built-in `node:sqlite` engine with WAL mode and foreign key enforcement).
- **Authentication**: `bcryptjs` (salt work factor 12) + `jsonwebtoken` (HMAC-SHA256).
- **Frontend**: Vanilla HTML5, modern CSS3 (glassmorphism, CSS variables, flexbox/grid), and asynchronous JavaScript (zero build step needed).
- **Containerization**: Docker (Alpine Linux base images) + Docker Compose orchestration.

---

## 📁 Project Structure

```
codealpha_tasks/
├── .env.example                     # Environment template with safe placeholders
├── .gitignore                       # Standard ignore rules (node_modules, logs, secrets)
├── docker-compose.yml               # Multi-service container orchestration
├── package.json                     # Root scripts for installation and unified testing
├── README.md                        # Project documentation and task matrix
├── docs/                            # Deep-dive architectural documentation
│   ├── architecture.md              # System design and microservices topology
│   ├── task1-data-redundancy.md     # Task 1 engine, schema, and API
│   ├── task3-bus-pass.md            # Task 3 auth, transactions, and schema
│   ├── task4-chatbot.md             # Task 4 NLP engine and knowledge base
│   └── deployment.md                # Docker and AWS/Azure/GCP deployment guide
├── scripts/
│   └── run-all-tests.js             # Unified test runner script
├── task1-data-redundancy/           # Task 1: Data Redundancy Removal System
│   ├── Dockerfile
│   ├── package.json
│   ├── public/                      # Responsive dashboard interface
│   │   └── index.html
│   ├── src/                         # Server, SQLite DB, deduplication engine
│   │   ├── database.js
│   │   ├── dedup-engine.js
│   │   └── server.js
│   └── tests/
│       └── test.js                  # 34 automated unit/integration tests
├── task3-bus-pass/                  # Task 3: Cloud-Based Bus Pass System
│   ├── Dockerfile
│   ├── package.json
│   ├── public/                      # Web portal (Auth, Catalog, Passes, Admin)
│   │   ├── index.html
│   │   ├── css/style.css
│   │   └── js/app.js
│   ├── src/
│   │   ├── middleware/auth.js       # JWT validation & role checking
│   │   ├── models/database.js       # Relational SQLite schema & seed data
│   │   ├── routes/auth.js           # Registration & login endpoints
│   │   ├── routes/passes.js         # Pass catalog, booking, renewal
│   │   └── server.js
│   └── tests/
│       └── test.js                  # 34 automated tests
└── task4-chatbot/                   # Task 4: Cloud Services Chatbot
    ├── Dockerfile
    ├── package.json
    ├── public/                      # Modern chat interface with suggestion pills
    │   ├── index.html
    │   ├── css/style.css
    │   └── js/app.js
    ├── src/
    │   ├── chatbot-engine.js        # Tokenizer, stop-word filter, scoring
    │   ├── knowledge-base.js        # Cloud computing domain knowledge base
    │   └── server.js
    └── tests/
        └── test.js                  # 22 automated tests
```

---

## 🚀 Prerequisites & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v20.0.0 or higher
- [Git](https://git-scm.com/)
- (Optional) [Docker Desktop](https://www.docker.com/) for containerized deployment

### Installation
Clone the repository and install all dependencies in each service directory:

```bash
git clone https://github.com/anasniet77/codealpha_tasks.git
cd codealpha_tasks

# Install all sub-project dependencies with a single command
npm run install:all
```

Alternatively, install individually:
```bash
cd task1-data-redundancy && npm install && cd ..
cd task3-bus-pass && npm install && cd ..
cd task4-chatbot && npm install && cd ..
```

---

## ⚡ Running the Applications

### Option A: Running Locally via Node.js

Start each service in a separate terminal:

```bash
# Task 1: Data Redundancy Removal System (Port 3001)
npm run start:task1

# Task 3: Cloud-Based Bus Pass System (Port 3003)
npm run start:task3

# Task 4: Cloud Services Chatbot (Port 3004)
npm run start:task4
```

Access the interfaces in your browser:
- 📊 **Task 1 Dashboard**: [http://localhost:3001](http://localhost:3001)
- 🚌 **Task 3 Bus Pass Portal**: [http://localhost:3003](http://localhost:3003)
- 🤖 **Task 4 Chatbot Assistant**: [http://localhost:3004](http://localhost:3004)

---

## 🧪 Running Automated Tests

Run all 90 automated tests across all three tasks with a single command:

```bash
npm test
```

### Test Output Summary
```
╔═══════════════════════════════════════════════════════════════╗
║                      FINAL TEST SUMMARY                       ║
╚═══════════════════════════════════════════════════════════════╝
  ✅ Task 1: Data Redundancy Removal System           [PASSED]  (34/34 tests)
  ✅ Task 3: Cloud-Based Bus Pass System              [PASSED]  (34/34 tests)
  ✅ Task 4: AI & Retrieval Cloud Chatbot             [PASSED]  (22/22 tests)
─────────────────────────────────────────────────────────────────
Summary: 3/3 task suites passed.
🎉 All CodeAlpha task tests passed successfully!
```

To run tests individually:
```bash
npm run test:task1
npm run test:task3
npm run test:task4
```

---

## 🐳 Docker & Containerized Deployment

Run the entire suite containerized with Docker Compose:

```bash
# Build images and start all 3 services
docker compose up --build -d

# Check container health and status
docker compose ps

# View live container logs
docker compose logs -f

# Stop all services
docker compose down
```

---

## ☁️ Cloud Deployment & Scaling

Each service includes a container health check and is ready for deployment on major cloud providers:

1. **AWS App Runner / ECS Fargate**: Deploy the repository directly or push images to AWS ECR. Set environment variables in the App Runner console.
2. **Azure Container Apps**: Containerized microservices scale independently based on HTTP traffic.
3. **Google Cloud Run**: Serverless container execution with automated HTTPS and scale-to-zero capabilities.

Detailed instructions, environment variable descriptions, and database migration notes are provided in [docs/deployment.md](docs/deployment.md).

---

## 📡 REST API Documentation

### Health Checks
- `GET http://localhost:3001/api/health` -> `{ status: "healthy", service: "data-redundancy-removal" }`
- `GET http://localhost:3003/api/health` -> `{ status: "healthy", service: "cloud-bus-pass-system" }`
- `GET http://localhost:3004/api/health` -> `{ status: "healthy", service: "chatbot", aiEnabled: false }`

For full endpoint listings, request/response bodies, and authentication headers, see the respective documentation in `docs/`:
- [Task 1 API Specification](docs/task1-data-redundancy.md)
- [Task 3 API Specification](docs/task3-bus-pass.md)
- [Task 4 API Specification](docs/task4-chatbot.md)

---

## 👤 Author
- **Intern**: Anas Khan
- **Repository**: [https://github.com/anasniet77/codealpha_tasks](https://github.com/anasniet77/codealpha_tasks)
- **Organization**: CodeAlpha Cloud Computing Internship
