---
entity_id: ms-generic-gallery-agent-guide
name: Fastify 5 & Cloud Run 128MiB Microservice Agent Guide
version: 1.0.0
runtime: node26-lts
framework: fastify-5
hosting: google-cloud-run
memory_limit: 128MiB
cpu_model: request-based
database: mongodb-atlas
security: app-check-verified
---

# ⚡ Backend Agent Guide: Fastify 5 & Cloud Run (128 MiB Budget)

This guide defines the non-negotiable architectural constraints, memory guidelines, and testing protocols for [`ms-generic-gallery`](./README.md).

---

## 💾 Part 1: The 128 MiB Cloud Run Memory Ceiling

`ms-generic-gallery` runs in production on Google Cloud Run with an ultra-lean memory allocation of **128 MiB**.

### 1. V8 Heap Budgeting

- The Node.js process is constrained by:
  ```dockerfile
  ENV NODE_OPTIONS="--max-old-space-size=90"
  ```
- **Rules**:
  - ❌ **NEVER** increase `--max-old-space-size` beyond 90 MiB (the remaining 38 MiB is reserved for V8 native buffers, garbage collector overhead, and OS runtime).
  - ❌ **NEVER** load entire database collections into memory arrays (`.toArray()` on unbounded queries is strictly prohibited).
  - ✅ Always enforce pagination with `limit` (max 50) and `skip` on MongoDB queries.
  - ✅ Use Node.js streams or cursor iteration for data transformations.

### 2. Request-Based CPU & Serverless Lifecycle

- Google Cloud Run is configured with `cpu_idle = true` (CPU is throttled when no requests are active).
- **Rules**:
  - ❌ **NEVER** use `setInterval()` or run long background cron tasks inside the container.
  - ✅ Background jobs must be triggered externally via Google Cloud Scheduler or Cloud Tasks.
  - ✅ Implement graceful shutdown handling for `SIGTERM` and `SIGINT` to close MongoDB connections cleanly.

### 3. Database Connection Pooling

- Connect to MongoDB Atlas once during Fastify plugin initialization (`fastify-plugin`).
- Reuse the single connection pool across all request lifecycles.
- Set `maxPoolSize: 10` and `minPoolSize: 1` to prevent excessive memory overhead per socket.

---

## 📜 Part 2: Route Architecture & Contract Enforcement

### 1. Standardized `DualEnvelope<T>` Response Format

Every JSON API response must conform to the unified envelope contract:

```typescript
interface DualEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
}
```

### 2. Schema Validation (Fastify / Zod)

- Every route MUST define typed input validation for:
  - `params` (e.g. `:id` must validate as MongoDB ObjectId)
  - `querystring` (e.g. `page`, `limit`, `tag`)
  - `body` (e.g. payload schema)
  - `response[200]` (Fastify fast-json-stringify schema for optimal serialization speed)

### 3. Firebase App Check Authentication

- Incoming requests to `/api/*` are validated via the App Check plugin.
- **Rule**: The `/health` endpoint **must always bypass App Check validation** so Cloud Run health check and startup probes can verify service readiness without credentials.

---

## 🧪 Part 3: Testing Standards & Quality Gates

### 1. In-Memory Testing with `fastify.inject()`

- Tests use `fastify.inject()` to simulate HTTP requests without binding to TCP network ports.
- Prevents port collision and allows tests to run in parallel in $<1\text{s}$.
- Current suite covers **24 unit tests** across:
  - Health check & probe responses
  - Route validation & error handling
  - App Check token validation & rejection
  - MongoDB query helpers & pagination

### 2. Shift-Left Quality Gate

Before pushing any commit, run:

```sh
# 1. Typecheck
npm run typecheck

# 2. Unit Tests (All 24 tests must pass)
npm test
```

Husky pre-commit hooks (`.husky/pre-commit`) will reject commits if either command fails.
