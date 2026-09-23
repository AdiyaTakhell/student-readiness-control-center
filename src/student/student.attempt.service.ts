import type { PrismaClient } from "../generated/prisma/client.js";
import {
    REQUIRED_COMPETENCIES,
    calculateReadiness,
} from "../domain/readiness.js";
import { selectLatestValidAttempt } from "../domain/latest-attempt.js";
import {
    createRequestFingerprint,
    findIdempotencyRecord,
} from "../idempotency/idempotency.service.js";

interface CreateAttemptInput {
    tenantId: string;
    studentId: string;
    competencyKey: string;
    evaluatorId: string;
    score: number;
    idempotencyKey: string;
    requestId: string;
}

type AttemptRejectionCode =
    | "STUDENT_NOT_FOUND"
    | "COMPETENCY_NOT_FOUND"
    | "EVALUATOR_NOT_FOUND";

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
    );
}

function isAttemptRejection(
    error: unknown,
): error is Error & {
    message: AttemptRejectionCode;
} {
    return (
        error instanceof Error &&
        (
            error.message ===
            "STUDENT_NOT_FOUND" ||
            error.message ===
            "COMPETENCY_NOT_FOUND" ||
            error.message ===
            "EVALUATOR_NOT_FOUND"
        )
    );
}

function getRejectionResponse(
    reasonCode: AttemptRejectionCode,
) {
    if (reasonCode === "STUDENT_NOT_FOUND") {
        return {
            status: 404,
            body: {
                error: {
                    code: "STUDENT_NOT_FOUND",
                    message: "Student not found",
                },
            },
        };
    }

    if (reasonCode === "COMPETENCY_NOT_FOUND") {
        return {
            status: 400,
            body: {
                error: {
                    code: "COMPETENCY_NOT_FOUND",
                    message:
                        "Required competency not found",
                },
            },
        };
    }

    return {
        status: 403,
        body: {
            error: {
                code: "EVALUATOR_NOT_FOUND",
                message:
                    "Evaluator is not authorized for this tenant",
            },
        },
    };
}

async function recordRejectedAttempt(
    prisma: PrismaClient,
    input: CreateAttemptInput,
    reasonCode: AttemptRejectionCode,
): Promise<void> {
    const rejection =
        getRejectionResponse(reasonCode);

    try {
        await prisma.$transaction(async (tx) => {
            const idempotencyRecord =
                await tx.idempotencyRecord.create({
                    data: {
                        tenantId:
                        input.tenantId,
                        key:
                        input.idempotencyKey,
                        requestFingerprint:
                            createRequestFingerprint({
                                studentId:
                                input.studentId,
                                competencyKey:
                                input.competencyKey,
                                score: input.score,
                            }),
                        responseStatus:
                        rejection.status,
                        responseBody:
                        rejection.body,
                        expiresAt:
                            new Date(
                                Date.now() +
                                24 *
                                60 *
                                60 *
                                1000,
                            ),
                    },
                });

            await tx.outboxEvent.create({
                data: {
                    eventType:
                        "ATTEMPT_REJECTED",
                    tenantId:
                    input.tenantId,
                    studentId:
                    input.studentId,
                    attemptId: null,
                    requestId:
                    input.requestId,
                    payload: {
                        eventId:
                        idempotencyRecord.id,
                        eventType:
                            "ATTEMPT_REJECTED",
                        tenantId:
                        input.tenantId,
                        studentId:
                        input.studentId,
                        attemptId: null,
                        requestId:
                        input.requestId,
                        occurredAt:
                            new Date().toISOString(),
                        metadata: {
                            reasonCode,
                        },
                    },
                },
            });
        });
    } catch (error) {
        if (!isUniqueConstraintError(error)) {
            throw error;
        }

        const existingRecord =
            await findIdempotencyRecord(
                prisma,
                input.tenantId,
                input.idempotencyKey,
            );

        if (!existingRecord) {
            throw error;
        }

        const requestFingerprint =
            createRequestFingerprint({
                studentId: input.studentId,
                competencyKey:
                input.competencyKey,
                score: input.score,
            });

        if (
            existingRecord.requestFingerprint !==
            requestFingerprint
        ) {
            throw new Error(
                "IDEMPOTENCY_KEY_REUSED",
            );
        }
    }
}

export async function createAttempt(
    prisma: PrismaClient,
    input: CreateAttemptInput,
) {
    const requestFingerprint =
        createRequestFingerprint({
            studentId: input.studentId,
            competencyKey:
            input.competencyKey,
            score: input.score,
        });

    const existingRecord =
        await findIdempotencyRecord(
            prisma,
            input.tenantId,
            input.idempotencyKey,
        );

    if (existingRecord) {
        if (
            existingRecord.requestFingerprint !==
            requestFingerprint
        ) {
            throw new Error(
                "IDEMPOTENCY_KEY_REUSED",
            );
        }

        if (
            existingRecord.responseStatus !==
            201
        ) {
            const errorBody =
                existingRecord.responseBody as {
                    error?: {
                        code?: string;
                    };
                };

            throw new Error(
                errorBody.error?.code ??
                "ATTEMPT_REJECTED",
            );
        }

        return existingRecord.responseBody;
    }

    try {
        return await prisma.$transaction(
            async (tx) => {
                const student =
                    await tx.student.findFirst({
                        where: {
                            id: input.studentId,
                            tenantId:
                            input.tenantId,
                        },
                        select: {
                            id: true,
                        },
                    });

                if (!student) {
                    throw new Error(
                        "STUDENT_NOT_FOUND",
                    );
                }

                const competency =
                    await tx.competency.findUnique(
                        {
                            where: {
                                key:
                                input.competencyKey,
                            },
                            select: {
                                key: true,
                                required: true,
                            },
                        },
                    );

                if (
                    !competency ||
                    !competency.required
                ) {
                    throw new Error(
                        "COMPETENCY_NOT_FOUND",
                    );
                }

                const evaluator =
                    await tx.user.findFirst({
                        where: {
                            id: input.evaluatorId,
                            tenantId:
                            input.tenantId,
                        },
                        select: {
                            id: true,
                        },
                    });

                if (!evaluator) {
                    throw new Error(
                        "EVALUATOR_NOT_FOUND",
                    );
                }

                const attempt =
                    await tx.attempt.create({
                        data: {
                            tenantId:
                            input.tenantId,
                            studentId:
                            input.studentId,
                            competencyKey:
                            input.competencyKey,
                            evaluatorId:
                            input.evaluatorId,
                            score:
                            input.score,
                        },
                        select: {
                            id: true,
                            competencyKey: true,
                            score: true,
                            submittedAt: true,
                        },
                    });

                const attempts =
                    await tx.attempt.findMany({
                        where: {
                            tenantId:
                            input.tenantId,
                            studentId:
                            input.studentId,
                        },
                        select: {
                            id: true,
                            competencyKey: true,
                            score: true,
                            submittedAt: true,
                            voided: true,
                        },
                    });

                const competencyWeights =
                    await tx.competency.findMany({
                        where: {
                            key: {
                                in: [
                                    ...REQUIRED_COMPETENCIES,
                                ],
                            },
                        },
                        select: {
                            key: true,
                            weight: true,
                        },
                    });

                const weightByKey =
                    new Map(
                        competencyWeights.map(
                            (item) => [
                                item.key,
                                item.weight.toNumber(),
                            ],
                        ),
                    );

                const latestScores =
                    REQUIRED_COMPETENCIES.map(
                        (key) => {
                            const latest =
                                selectLatestValidAttempt(
                                    attempts
                                        .filter(
                                            (item) =>
                                                item.competencyKey ===
                                                key,
                                        )
                                        .map(
                                            (item) => ({
                                                id:
                                                item.id,
                                                submittedAt:
                                                item.submittedAt,
                                                score:
                                                    item.score.toNumber(),
                                                voided:
                                                item.voided,
                                            }),
                                        ),
                                );

                            return {
                                key,
                                score:
                                    latest?.score ??
                                    null,
                                weight:
                                    weightByKey.get(
                                        key,
                                    ) ?? 0,
                            };
                        },
                    );

                const readiness =
                    calculateReadiness(
                        latestScores,
                    );

                await tx.student.update({
                    where: {
                        id: student.id,
                    },
                    data: {
                        currentScore:
                        readiness.score,
                        readiness:
                        readiness.status,
                    },
                });

                const responseBody = {
                    attempt: {
                        id: attempt.id,
                        competencyKey:
                        attempt.competencyKey,
                        score:
                            attempt.score.toNumber(),
                        submittedAt:
                            attempt.submittedAt.toISOString(),
                    },
                    readiness: {
                        score:
                        readiness.score,
                        status:
                        readiness.status,
                    },
                };

                await tx.outboxEvent.create({
                    data: {
                        eventType:
                            "ATTEMPT_SUCCEEDED",
                        tenantId:
                        input.tenantId,
                        studentId:
                        input.studentId,
                        attemptId:
                        attempt.id,
                        requestId:
                        input.requestId,
                        occurredAt:
                        attempt.submittedAt,
                        payload: {
                            eventId:
                            attempt.id,
                            eventType:
                                "ATTEMPT_SUCCEEDED",
                            tenantId:
                            input.tenantId,
                            studentId:
                            input.studentId,
                            attemptId:
                            attempt.id,
                            requestId:
                            input.requestId,
                            occurredAt:
                                attempt.submittedAt.toISOString(),
                            metadata: {
                                competencyKey:
                                attempt.competencyKey,
                                score:
                                    attempt.score.toNumber(),
                                readinessScore:
                                readiness.score,
                                readinessStatus:
                                readiness.status,
                            },
                        },
                    },
                });

                await tx.idempotencyRecord.create({
                    data: {
                        tenantId:
                        input.tenantId,
                        key:
                        input.idempotencyKey,
                        requestFingerprint,
                        responseStatus: 201,
                        responseBody,
                        expiresAt:
                            new Date(
                                Date.now() +
                                24 *
                                60 *
                                60 *
                                1000,
                            ),
                    },
                });

                return responseBody;
            },
        );
    } catch (error) {
        if (isAttemptRejection(error)) {
            await recordRejectedAttempt(
                prisma,
                input,
                error.message,
            );

            throw error;
        }

        if (!isUniqueConstraintError(error)) {
            throw error;
        }

        const committedRecord =
            await findIdempotencyRecord(
                prisma,
                input.tenantId,
                input.idempotencyKey,
            );

        if (!committedRecord) {
            throw error;
        }

        if (
            committedRecord.requestFingerprint !==
            requestFingerprint
        ) {
            throw new Error(
                "IDEMPOTENCY_KEY_REUSED",
            );
        }

        if (
            committedRecord.responseStatus !==
            201
        ) {
            const errorBody =
                committedRecord.responseBody as {
                    error?: {
                        code?: string;
                    };
                };

            throw new Error(
                errorBody.error?.code ??
                "ATTEMPT_REJECTED",
            );
        }

        return committedRecord.responseBody;
    }
}