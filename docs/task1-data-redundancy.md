# Task 1: Data Redundancy Removal System

## Overview
The **Data Redundancy Removal System** prevents, classifies, and eliminates duplicate records before data enters the database, protecting data integrity in cloud storage and distributed services.

---

## 1. Classification Engine

The deduplication engine implements a multi-tier classification pipeline:

```
Incoming Record
      │
      ▼
┌───────────────────────────┐
│ Input Validation          │──[Invalid]──► HTTP 400 Bad Request
└─────────────┬─────────────┘
              │ [Valid]
              ▼
┌───────────────────────────┐
│ 1. Exact Email Check      │──[Match]────► Exact Duplicate (Score: 1.0) -> Reject
└─────────────┬─────────────┘
              │ [No Match]
              ▼
┌───────────────────────────┐
│ 2. Phone + Name Check     │──[Match]────► Exact Duplicate (Score: >= 0.85) -> Reject
└─────────────┬─────────────┘
              │ [No Match]
              ▼
┌───────────────────────────┐
│ 3. Weighted Fuzzy Match   │
│   - Name Sim (50%)        │
│   - Address Sim (30%)     │
│   - City Sim (20%)        │
└─────────────┬─────────────┘
              ├──[Score >= 0.85]──────────► Fuzzy Duplicate -> Reject
              ├──[0.60 <= Score < 0.85]───► False Positive Warning -> Flagged/Audit
              └──[Score < 0.60]───────────► Unique Record -> Inserted
```

### 1.1 Similarity Algorithm
Calculates the **Sørensen–Dice coefficient** across bigrams:
$$\text{Similarity}(S_1, S_2) = \frac{2 \times |B_1 \cap B_2|}{|B_1| + |B_2|}$$
- Case normalization and whitespace suppression ensure robustness against typographical variations.
- Phone numbers are stripped of non-digit characters to handle standard format discrepancies (e.g., `+1 (555) 019-2834` vs `5550192834`).

---

## 2. Database Schema & Integrity

The system maintains two tables in SQLite:

```sql
CREATE TABLE records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE redundancy_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incoming_data TEXT NOT NULL,
  matched_record_id INTEGER,
  match_type TEXT NOT NULL,  -- 'exact_duplicate', 'fuzzy_match', 'false_positive', 'unique'
  similarity_score REAL,
  action_taken TEXT NOT NULL, -- 'rejected', 'flagged', 'inserted'
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matched_record_id) REFERENCES records(id)
);
```

- A strict `UNIQUE` constraint on `records.email` enforces hardware-level deduplication even if application logic is bypassed.
- Indices on `email`, `(first_name, last_name)`, and `phone` guarantee fast sub-millisecond lookups.

---

## 3. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service health status and timestamp. |
| `POST` | `/api/records` | Processes incoming record through dedup pipeline and logs result. |
| `POST` | `/api/records/validate` | Validates record syntax without inserting or checking duplicates. |
| `GET` | `/api/records` | Retrieves paginated unique records. |
| `GET` | `/api/logs` | Retrieves full audit log of all decisions (duplicates, fuzzy matches, unique entries). |
| `GET` | `/api/stats` | Returns total unique records, duplicates rejected, and false positive counts. |

---

## 4. Test Coverage

Run tests:
```bash
cd task1-data-redundancy
npm test
```
The automated test suite (`tests/test.js`) verifies:
- Validation logic (required fields, email format, phone lengths)
- Unique insertions and duplicate prevention
- Exact duplicate detection (case-insensitive, whitespace variations)
- Fuzzy match thresholding
- False positive separation (e.g. `Robert Smith` vs `Bob Smith`)
- SQLite unique constraint adherence
- Audit log persistence
