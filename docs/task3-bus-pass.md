# Task 3: Cloud-Based Bus Pass System

## Overview
The **Cloud-Based Bus Pass System** provides a multi-tenant, cloud-ready digital platform for commuter registration, route browsing, pass booking, server-side price validation, and lifecycle management.

---

## 1. Key Functional Components

### 1.1 Secure Authentication & RBAC
- User passwords are salted and hashed using `bcryptjs` (work factor 12).
- Authenticated requests use stateless Bearer JWTs signed with HMAC-SHA256.
- Role-Based Access Control (`role: 'user'` vs `role: 'admin'`) safeguards administrative operations.

### 1.2 Server-Side Price & Transaction Validation
- **Zero Client Trust**: The client never passes the monetary amount directly. Pricing is determined strictly server-side by looking up the official pass type catalog.
- **Idempotent Transactions**: Every booking supports an optional `idempotency_key`. Repeating a network request with the same idempotency key prevents duplicate charges and multiple pass issuances.
- **Atomic Operations**: Application registration, financial ledger creation, and pass generation happen inside a single SQLite ACID transaction.

### 1.3 Pass Renewal & Validity Tracking
- Active passes include dynamic status indicators (`active`, `expired`, `cancelled`).
- Renewal extends an existing pass by adding the selected duration onto the current expiration date (or starting from today if already expired).

---

## 2. Database Schema

The database contains 6 interrelated tables with foreign key enforcement:

- `users`: ID, name, unique email, password hash, phone, address, role (`user`/`admin`).
- `pass_types`: Standard pricing tiers (Daily $5, Weekly $25, Monthly $75, Quarterly $180, Annual $600, Student $45, Senior $40).
- `routes`: Public transit routes with route numbers, origin, destination, and intermediate stops.
- `pass_applications`: Records pass request submissions and approvals.
- `transactions`: Records financial transaction IDs, idempotency keys, payment methods, and timestamps.
- `active_passes`: Cryptographically unique pass numbers (`BP-XXXXXXXXXXXX`), validity intervals, and status.

---

## 3. REST API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | System health check and uptime. |
| `POST` | `/api/auth/register` | No | Registers user with hashed credentials. |
| `POST` | `/api/auth/login` | No | Authenticates user and returns JWT token. |
| `GET` | `/api/auth/me` | Yes | Retrieves current user profile. |
| `GET` | `/api/passes/types` | No | Returns active pass catalog with prices. |
| `GET` | `/api/passes/routes` | No | Returns list of configured transit routes. |
| `POST` | `/api/passes/apply` | Yes | Applies for a pass and executes transaction atomically. |
| `GET` | `/api/passes/my-passes` | Yes | Retrieves authenticated user's active/expired passes. |
| `POST` | `/api/passes/renew/:id` | Yes | Renews an existing pass. |
| `GET` | `/api/passes/transactions` | Yes | Retrieves user's payment transaction history. |

---

## 4. Test Suite

Run tests:
```bash
cd task3-bus-pass
npm test
```
The test suite (`tests/test.js`) executes 34 automated assertions verifying:
- Table definitions and default seed data
- Password hashing and duplicate email rejection
- JWT token signing, payload extraction, and invalid signature rejection
- Application and pass creation
- Server-side price enforcement
- Idempotency key duplicate protection
- Foreign key cascading and constraint violations
- Pass renewal date calculation
