# Decisions

## 1. PostgreSQL is the source of truth; MongoDB stores operational events

PostgreSQL owns transactional business state and relational invariants, including
tenant ownership, unique email per tenant, attempts, idempotency records, and
optimistic concurrency.

MongoDB stores append-only operational activity events used for investigation
and operational visibility. MongoDB is not used as the source of truth for
student readiness or assessment state.

Trade-off: the system uses two data stores, so operational events are
eventually consistent with relational state.

## 2. Use a transactional outbox for MongoDB event delivery

PostgreSQL and MongoDB do not participate in one shared transaction.

For a successful relational operation, the PostgreSQL transaction will write
both the business state and an outbox event atomically. A relay process will
publish the outbox event to MongoDB after the transaction commits.

MongoDB event documents use eventId as their idempotent identity so that a
replayed delivery cannot create a duplicate logical event.

Trade-off: event delivery is eventually consistent. A MongoDB outage after a
successful PostgreSQL commit delays event visibility but does not lose the
event.

Deferred concern: a production deployment would use a durable background
worker with retry/backoff, monitoring, and dead-letter handling. The assessment
implementation will keep this mechanism intentionally small.

## 3. Store readiness as a derived projection

The Student record stores the current readiness projection:

- current score
- readiness status

The Attempts table remains the authoritative evidence.

After an attempt is created, the latest non-voided attempt for each required
competency is recalculated inside the same PostgreSQL transaction. The
resulting weighted score and readiness status are then written to the Student
projection.

Trade-off: every successful attempt performs additional relational work, but
student-list reads remain inexpensive and predictable.

The projection must always be reproducible from the Attempts table.

## 4. Current competency evidence is deterministic

For each student and competency, the current competency score is the latest
non-voided attempt.

Ordering is:

1. submittedAt descending
2. attempt ID descending as the deterministic tie-breaker

This guarantees that equal timestamps still produce one stable result.

## 5. Tenant context comes from authentication

Tenant identity is derived from the authenticated user context on the server.

Client-supplied tenant identifiers are never trusted for authorization.

Every PostgreSQL and MongoDB resource query that is tenant-owned must be
scoped using the authenticated tenant ID.

Cross-tenant resources use non-disclosing behavior so that callers cannot use
resource existence as an oracle.

## 6. Idempotency is enforced by the database

POST attempt requests require an Idempotency-Key.

The idempotency record is unique by:

tenant + idempotency key

The request fingerprint is stored with the idempotency record.

The same tenant and key with the same request body replays the original
logical result.

The same tenant and key with a different request body is rejected.

The uniqueness constraint is enforced in PostgreSQL rather than relying only
on application-level checks.

## 7. Optimistic concurrency protects mutable student state

Student updates require an expected entity version.

An update succeeds only when the supplied expected version matches the current
database version.

A stale update returns a conflict and must not partially modify the student.

## 8. Frontend server state is tenant-aware

TanStack Query keys include the active authenticated tenant context where
tenant switching can occur.

Queries use AbortSignal so obsolete requests can be cancelled.

A tenant switch must not allow an older response to populate the newly selected
tenant's UI or cache.

This is a defense-in-depth measure. The server remains the authoritative
tenant-isolation boundary.

## Deferred improvement

Real-time activity delivery through WebSockets is intentionally deferred.

The current implementation uses the activity API and polling/refetching.

This keeps the assessment implementation focused on correctness, security,
idempotency, concurrency, and testability.
