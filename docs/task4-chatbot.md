# Task 4: Cloud Services AI & Retrieval Chatbot

## Overview
**CloudHelp** is an intelligent assistant designed for cloud computing customer support and help desk scenarios. It utilizes a hybrid architecture:
1. **Deterministic Retrieval-Based Engine**: Ultra-fast, zero-dependency tokenization, stop-word elimination, and multi-factor similarity matching against a curated cloud domain knowledge base.
2. **Generative AI Fallback (Optional)**: If an `OPENAI_API_KEY` is configured in `.env`, unanswered or ambiguous questions automatically route to OpenAI's GPT models without exposing keys to frontend clients.

---

## 1. NLP Engine & Retrieval Mechanics

```
User Query: "What is cloud computing?"
      │
      ▼
┌───────────────────────────────────────┐
│ Tokenization & Normalization          │ -> ['what', 'is', 'cloud', 'computing']
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Stop-Word Filtering                   │ -> ['cloud', 'computing']
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Knowledge Base Similarity Matching    │
│  - Jaccard Similarity (30%)           │
│  - Keyword Overlap (50%)              │
│  - Input Coverage (20%)               │
│  - Word-boundary Phrase Matching      │
└──────────────────┬────────────────────┘
                   │
         Score >= 0.30 & Content Match?
          ├──[Yes]──► Return Best Response + Confidence
          └──[No]───► Is OPENAI_API_KEY set?
                        ├──[Yes]──► Forward to OpenAI Chat Completion
                        └──[No]───► Return Smart Fallback with Topic Suggestions
```

---

## 2. Commercial Knowledge Base Topics

The engine contains comprehensive Q&A coverage across 20+ cloud computing disciplines:
- **Foundations**: Definitions, shared responsibility, on-demand scaling
- **Service Models**: IaaS vs PaaS vs SaaS with concrete real-world examples
- **Providers**: AWS vs Microsoft Azure vs Google Cloud Platform
- **Deployment Models**: Public, private, hybrid, and multi-cloud strategies
- **Pricing & FinOps**: Pay-as-you-go, reserved instances, spot instances, free tiers
- **Security & Compliance**: IAM least-privilege, encryption at rest/transit, VPCs
- **Containers & Orchestration**: Docker fundamentals, Kubernetes pods/services/scaling
- **Serverless**: Event-driven computing, AWS Lambda, Azure Functions, Cloud Functions
- **DevOps**: CI/CD pipelines, automated testing, deployment stages
- **Storage & Networking**: Object (S3), block (EBS), file systems (EFS), VPCs, CDNs, Route 53

---

## 3. Security & Secret Protection

- **Zero Secrets in Frontend**: The client interface communicates exclusively with the `/api/chat` backend endpoint.
- **Environment Ingestion**: The OpenAI API key is read solely from `process.env.OPENAI_API_KEY` on the Node.js server.
- **Graceful Degradation**: If no API key is provided, the application runs 100% locally in retrieval mode with full functionality and zero crashes.

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service status and whether AI generative mode is active. |
| `POST` | `/api/chat` | Accepts `{ message: string }`, returns `{ response, category, confidence, engine }`. |
| `GET` | `/api/suggestions` | Returns predefined prompt pills for the chat interface. |
