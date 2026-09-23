# AI Log

This document records material AI assistance used during the assessment.
AI-generated suggestions are reviewed, tested, and modified before being
accepted into the codebase.

## Session 1 — Architecture and project scaffold

### Tool

ChatGPT

### Material prompts / requests

- Designed the architecture for a multi-tenant Student Readiness Control
  Center using React + TypeScript, Fastify + TypeScript, PostgreSQL + Prisma,
  and MongoDB.
- Requested a production-oriented folder structure and database model.
- Requested guidance for tenant isolation, readiness calculation,
  idempotency, optimistic concurrency, and MongoDB activity events.

### Accepted output

- Feature-oriented backend structure.
- PostgreSQL as the business source of truth.
- MongoDB as the operational event store.
- Tenant-scoped relational model.
- Attempt and idempotency data model.
- Derived readiness projection on Student.

### Rejected or modified output

- Any design that trusted a client-supplied tenant ID for authorization.
- Any design that treated MongoDB as business truth.
- Any design that required a distributed transaction between PostgreSQL and
  MongoDB.
- Any unnecessary abstraction not justified by the assessment.

### Verification

The proposed schema and architecture were compared against the assessment
requirements. Runtime verification is performed separately through migrations,
tests, and integration tests.

---

## Session 2 — Infrastructure and version review

### Tool

ChatGPT

### Material prompts / requests

- Reviewed Docker Compose configuration for PostgreSQL and MongoDB.
- Requested stable/LTS dependency choices.
- Reviewed Node.js version and database image choices.

### Accepted output

- Node.js 24 LTS as the project runtime.
- PostgreSQL 18.x as the PostgreSQL major version.
- MongoDB 8.0 as the MongoDB major release line.
- Pinned container image versions for reproducible local development.
- PostgreSQL and MongoDB health checks.

### Rejected or modified output

- Floating `latest` image tags.
- Non-LTS or release-candidate runtime/framework choices.
- Obsolete Docker Compose `version` field.

### Verification

Docker Compose configuration must be validated with:

    docker compose config

Container health must be verified with:

    docker compose ps

The project does not claim runtime verification until those commands have
completed successfully.

---

## Session 3 — Documentation and incident review

### Tool

ChatGPT

### Material prompts / requests

- Reviewed DECISIONS.md, AI_LOG.md, and INCIDENT.md against the assessment.
- Requested identification of unsupported incident conclusions and missing
  evidence.

### Accepted output

- Separate confirmed facts from hypotheses.
- Treat tenant cache-key isolation as a concrete incident concern.
- Require server-side tenant derivation and database query scoping.
- Add explicit containment, durable repair, verification, and missing-evidence
  sections to INCIDENT.md.

### Rejected or modified output

The statement that client-supplied tenant identifiers were definitely the
incident root cause was not accepted as a confirmed fact because the supplied
incident evidence does not establish that conclusion by itself.

The statement that particular security/error-handling changes were already
implemented was also not accepted until verified in the repository.

### Verification

Incident conclusions will be updated after inspecting the relevant starter
code, request traces, cache implementation, authorization logic, and tests.

---

## Verification policy

No AI-generated code or architectural decision is considered verified merely
because it looks correct.

Verification evidence must come from one or more of:

- TypeScript compilation
- automated tests
- database integration tests
- concurrency tests
- actual HTTP requests
- Docker/container health checks
- direct source-code inspection
- migration verification

The final submission will describe which AI-assisted changes were actually
accepted and how each was verified.

