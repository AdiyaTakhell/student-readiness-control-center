import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTestPrisma } from "../test/test-database.js";
import { createAttempt } from "./student.attempt.service.js";

const prisma = createTestPrisma();

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const STUDENT_ID = "00000000-0000-0000-0000-000000000102";
const EVALUATOR_ID = "00000000-0000-0000-0000-000000000012";

describe("createAttempt transaction", () => {
    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("rolls back all writes when the transaction fails", async () => {
        const idempotencyKey = `rollback-test-${randomUUID()}`;

        await prisma.idempotencyRecord.create({
            data: {
                tenantId: TENANT_ID,
                key: idempotencyKey,
                requestFingerprint: "expired-record",
                responseStatus: 201,
                responseBody: {},
                expiresAt: new Date(Date.now() - 60_000)
            }
        });

        const before = await prisma.$transaction([
            prisma.attempt.count({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                }
            }),
            prisma.outboxEvent.count({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                }
            }),
            prisma.student.findFirstOrThrow({
                where: {
                    id: STUDENT_ID,
                    tenantId: TENANT_ID
                },
                select: {
                    currentScore: true,
                    readiness: true
                }
            })
        ]);

        await expect(
            createAttempt(prisma, {
                tenantId: TENANT_ID,
                studentId: STUDENT_ID,
                competencyKey: "backend",
                evaluatorId: EVALUATOR_ID,
                score: 95,
                idempotencyKey,
                requestId: "rollback-test"
            })
        ).rejects.toThrow();

        const after = await prisma.$transaction([
            prisma.attempt.count({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                }
            }),
            prisma.outboxEvent.count({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                }
            }),
            prisma.student.findFirstOrThrow({
                where: {
                    id: STUDENT_ID,
                    tenantId: TENANT_ID
                },
                select: {
                    currentScore: true,
                    readiness: true
                }
            })
        ]);

        expect(after[0]).toBe(before[0]);
        expect(after[1]).toBe(before[1]);
        expect(after[2]).toEqual(before[2]);

        await prisma.idempotencyRecord.delete({
            where: {
                tenantId_key: {
                    tenantId: TENANT_ID,
                    key: idempotencyKey
                }
            }
        });
    });

    it("returns one logical result for parallel requests with the same idempotency key", async () => {
        const idempotencyKey = `parallel-test-${randomUUID()}`;

        const beforeAttemptIds = new Set(
            (
                await prisma.attempt.findMany({
                    where: {
                        tenantId: TENANT_ID,
                        studentId: STUDENT_ID
                    },
                    select: {
                        id: true
                    }
                })
            ).map((attempt) => attempt.id)
        );

        try {
            const [resultA, resultB] = await Promise.all([
                createAttempt(prisma, {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID,
                    competencyKey: "backend",
                    evaluatorId: EVALUATOR_ID,
                    score: 97,
                    idempotencyKey,
                    requestId: "parallel-request-a"
                }),
                createAttempt(prisma, {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID,
                    competencyKey: "backend",
                    evaluatorId: EVALUATOR_ID,
                    score: 97,
                    idempotencyKey,
                    requestId: "parallel-request-b"
                })
            ]);

            expect(resultA).not.toBeNull();
            expect(resultB).not.toBeNull();

            if (
                resultA === null ||
                typeof resultA !== "object" ||
                !("attempt" in resultA) ||
                resultB === null ||
                typeof resultB !== "object" ||
                !("attempt" in resultB)
            ) {
                throw new Error("Unexpected createAttempt response");
            }

            const attemptA = resultA.attempt;
            const attemptB = resultB.attempt;

            if (
                attemptA === null ||
                typeof attemptA !== "object" ||
                !("id" in attemptA) ||
                typeof attemptA.id !== "string" ||
                attemptB === null ||
                typeof attemptB !== "object" ||
                !("id" in attemptB) ||
                typeof attemptB.id !== "string"
            ) {
                throw new Error("Unexpected attempt response");
            }

            const attemptIdA = attemptA.id;
            const attemptIdB = attemptB.id;

            expect(attemptIdA).toBe(attemptIdB);

            const afterAttempts = await prisma.attempt.findMany({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                },
                select: {
                    id: true
                }
            });

            const newAttemptIds = afterAttempts
                .map((attempt) => attempt.id)
                .filter((id) => !beforeAttemptIds.has(id));

            expect(newAttemptIds).toHaveLength(1);

            const outboxCount = await prisma.outboxEvent.count({
                where: {
                    tenantId: TENANT_ID,
                    attemptId: attemptIdA
                }
            });

            expect(outboxCount).toBe(1);
        } finally {
            const afterAttempts = await prisma.attempt.findMany({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                },
                select: {
                    id: true
                }
            });

            const newAttemptIds = afterAttempts
                .map((attempt) => attempt.id)
                .filter((id) => !beforeAttemptIds.has(id));

            if (newAttemptIds.length > 0) {
                await prisma.outboxEvent.deleteMany({
                    where: {
                        attemptId: {
                            in: newAttemptIds
                        }
                    }
                });

                await prisma.attempt.deleteMany({
                    where: {
                        id: {
                            in: newAttemptIds
                        }
                    }
                });
            }

            await prisma.idempotencyRecord
                .delete({
                    where: {
                        tenantId_key: {
                            tenantId: TENANT_ID,
                            key: idempotencyKey
                        }
                    }
                })
                .catch(() => {
                    // Record may not exist if persistence failed.
                });
        }
    });

    it("rejects reuse of an idempotency key with a different request body", async () => {
        const idempotencyKey = `conflict-test-${randomUUID()}`;

        const beforeAttemptIds = new Set(
            (
                await prisma.attempt.findMany({
                    where: {
                        tenantId: TENANT_ID,
                        studentId: STUDENT_ID
                    },
                    select: {
                        id: true
                    }
                })
            ).map((attempt) => attempt.id)
        );

        try {
            const firstResult = await createAttempt(prisma, {
                tenantId: TENANT_ID,
                studentId: STUDENT_ID,
                competencyKey: "backend",
                evaluatorId: EVALUATOR_ID,
                score: 91,
                idempotencyKey,
                requestId: "conflict-request-a"
            });

            expect(firstResult).not.toBeNull();

            await expect(
                createAttempt(prisma, {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID,
                    competencyKey: "backend",
                    evaluatorId: EVALUATOR_ID,
                    score: 92,
                    idempotencyKey,
                    requestId: "conflict-request-b"
                })
            ).rejects.toThrow("IDEMPOTENCY_KEY_REUSED");

            const afterAttempts = await prisma.attempt.findMany({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                },
                select: {
                    id: true
                }
            });

            const newAttemptIds = afterAttempts
                .map((attempt) => attempt.id)
                .filter((id) => !beforeAttemptIds.has(id));

            expect(newAttemptIds).toHaveLength(1);
        } finally {
            const afterAttempts = await prisma.attempt.findMany({
                where: {
                    tenantId: TENANT_ID,
                    studentId: STUDENT_ID
                },
                select: {
                    id: true
                }
            });

            const newAttemptIds = afterAttempts
                .map((attempt) => attempt.id)
                .filter((id) => !beforeAttemptIds.has(id));

            if (newAttemptIds.length > 0) {
                await prisma.outboxEvent.deleteMany({
                    where: {
                        attemptId: {
                            in: newAttemptIds
                        }
                    }
                });

                await prisma.attempt.deleteMany({
                    where: {
                        id: {
                            in: newAttemptIds
                        }
                    }
                });
            }

            await prisma.idempotencyRecord
                .delete({
                    where: {
                        tenantId_key: {
                            tenantId: TENANT_ID,
                            key: idempotencyKey
                        }
                    }
                })
                .catch(() => {
                    // Record may not exist if persistence failed.
                });
        }
    });
});