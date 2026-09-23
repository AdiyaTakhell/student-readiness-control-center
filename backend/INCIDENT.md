# Incident Investigation

## Incident

A tenant reported that one click created two attempts. The dashboard score
changed from 78 to 84 and later displayed 81 after refresh.

Another tenant briefly saw a student name that did not belong to that tenant.

The deployment completed at 10:05 UTC and the incident was observed at
10:12 UTC.

No production data should be modified during the investigation.

---

## 1. Confirmed facts from the incident evidence

### Duplicate attempts

The logs show two requests using the same tenant and the same
Idempotency-Key:

    10:12:01.102 req=a91 tenant=t-blue user=u17
    POST /students/s44/attempts key=k-778 score=90

    10:12:01.119 req=b03 tenant=t-blue user=u17
    POST /students/s44/attempts key=k-778 score=90

Both requests then inserted and committed separate attempts:

    10:12:01.182 req=a91 sql attempt.insert id=991 committed
    10:12:01.190 req=b03 sql attempt.insert id=992 committed

This is consistent with a failure of the idempotency invariant.

The schema evidence also states that idempotency_records has no unique
constraint on tenant_id + key.

### Cross-tenant student visibility

The incident evidence shows:

    10:12:04.331 req=c10 tenant=t-green
    GET /students?status=READY
    cache=hit
    cacheKey=students:READY

The cache key contains status but not tenant identity.

Therefore requests from different tenants can address the same cache entry.

This is a confirmed cache-isolation defect.

### Readiness race

The deployment facts state that readiness is recalculated by reading all
attempts in application code and then updating students.current_score.

Combined with the two concurrent committed attempts, this creates a race
condition in the aggregate projection.

The exact final-value sequence must be reproduced in a test before claiming
the complete causal chain.

### MongoDB reliability gap

The logs show:

    req=b03 mongo event.insert eventId=e-992 timeout

followed by:

    response=201 attemptId=992

The deployment facts state that the MongoDB error was caught and only logged.

Therefore the API could return success after the relational write while the
required event was not confirmed.

---

## 2. Current hypotheses

### Hypothesis A — Duplicate attempt creation

Two parallel requests with the same Idempotency-Key were allowed to pass
because the database did not enforce a unique tenant + key constraint.

This is strongly supported by the schema and request logs.

### Hypothesis B — Cross-tenant cache collision

The cache key omitted tenant identity.

This is directly supported by:

    cacheKey=students:READY

The key must contain tenant context.

### Hypothesis C — Incorrect readiness projection

Concurrent application-level recomputation of the Student score may have
allowed one request to overwrite another request's correct projection.

This is consistent with the incident timeline and deployment facts but should
be demonstrated with a deterministic concurrent test.

### Hypothesis D — Additional tenant trust-boundary defects

The frontend may also have allowed stale responses or tenant state to cross
an account switch.

This cannot be declared the root cause from the incident evidence alone.

The relevant authentication, authorization, frontend query-key, request
cancellation, and API code must be inspected.

---

## 3. First 15 minutes — containment

1. Stop or disable the affected attempt-submission path if duplicate writes
   cannot immediately be prevented safely.

2. Disable the unsafe shared student-list cache or make the cache key include
   tenant identity before restoring cached reads.

3. Preserve application logs, database state, deployment information, and
   request IDs for investigation.

4. Do not delete or manually rewrite production attempts during initial
   containment.

5. Confirm whether MongoDB event delivery is failing and preserve failed event
   identifiers for replay.

6. Identify whether the incident affects one tenant or multiple tenants.

---

## 4. Durable corrections

### Idempotency

Add a database uniqueness constraint on:

    (tenant_id, key)

Store a canonical request fingerprint with the idempotency record.

The first request creates the idempotency record and business result inside
one PostgreSQL transaction.

An identical retry replays the stored outcome.

A reused key with a different request fingerprint returns a conflict.

### Cache isolation

Every tenant-owned cache entry must include authenticated tenant context.

For example:

    students:{tenantId}:{status}:{page}:{pageSize}:{sort}:{order}

Do not allow a client-supplied tenant ID to define authorization.

### Readiness recomputation

Serialize conflicting updates for the same Student, then calculate readiness
from authoritative Attempt rows inside the same PostgreSQL transaction.

Do not incrementally update the aggregate from a previously read score.

The resulting projection must be reproducible from the attempt evidence.

### Event reliability

Write an outbox record in the same PostgreSQL transaction as the successful
business operation.

A relay publishes the outbox record to MongoDB.

MongoDB inserts are idempotent using eventId as the unique event identity.

Failed deliveries remain available for retry rather than being silently
discarded.

---

## 5. Safe data-repair approach

Do not immediately delete duplicate attempts.

First identify candidate duplicates using:

- same tenant
- same idempotency key where available
- matching request fingerprint where available
- matching student
- matching competency
- matching score
- closely aligned submission timestamps
- correlated request IDs

Create a review report containing candidate duplicates and their evidence.

Determine which attempt is the canonical logical result before any corrective
write.

Preserve valid historical attempts.

Any production repair must be reviewed and executed through an approved,
auditable process.

---

## 6. Verification after the fix

### Database tests

- tenant + idempotency key has a unique constraint
- latest attempt tie-breaking is deterministic
- readiness is reproducible from Attempts
- concurrent attempts cannot corrupt the Student projection

### API integration tests

- identical parallel requests create one logical attempt
- same key with different body returns conflict
- cross-tenant resource access does not leak existence
- failed transactions leave no partial relational state

### Frontend tests

- switching tenants cancels obsolete requests
- delayed responses from the previous tenant cannot update the current tenant
- query/cache state is tenant-aware

### Event tests

- successful relational commit produces an outbox event
- Mongo outage does not lose the event
- retrying the same event does not create a duplicate Mongo document

### Operational verification

Monitor:

- idempotency conflict rate
- duplicate-attempt candidates
- outbox backlog
- Mongo delivery failures
- tenant-isolation authorization failures
- cache hit/miss behavior by tenant

---

## 7. Evidence still required

The current incident report does not prove every causal statement.

Before closing the investigation, obtain:

- authentication and authorization implementation
- frontend tenant/account-switch implementation
- TanStack Query keys
- cache implementation and invalidation behavior
- database constraints and indexes
- exact transaction boundaries
- request correlation between frontend and API
- MongoDB event retry behavior
- metrics for affected tenants
- deployment diff from the 10:05 UTC release

The seeded defect should be reproduced with a test before its exact root cause
is declared.

