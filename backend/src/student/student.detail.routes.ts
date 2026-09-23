import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth/auth.hooks.js";
import {
    REQUIRED_COMPETENCIES,
    calculateReadiness
} from "../domain/readiness.js";
import { selectLatestValidAttempt } from "../domain/latest-attempt.js";

const studentIdSchema = z.object({
    id: z.string().regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        "Invalid UUID"
    )
});

export default async function studentDetailRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/api/students/:id",
        {
            preHandler: authenticate
        },
        async (request, reply) => {
            const validation = studentIdSchema.safeParse(
                request.params
            );

            if (!validation.success) {
                return reply.code(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid student ID",
                        requestId: request.id,
                        fields: validation.error.flatten().fieldErrors
                    }
                });
            }

            const [student, competencies] = await Promise.all([
                app.prisma.student.findFirst({
                    where: {
                        id: validation.data.id,
                        tenantId: request.user.tenantId
                    },
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        version: true,
                        attempts: {
                            select: {
                                id: true,
                                competencyKey: true,
                                score: true,
                                submittedAt: true,
                                voided: true
                            },
                            orderBy: [
                                { submittedAt: "desc" },
                                { id: "desc" }
                            ]
                        }
                    }
                }),

                app.prisma.competency.findMany({
                    where: {
                        key: {
                            in: [...REQUIRED_COMPETENCIES]
                        }
                    },
                    select: {
                        key: true,
                        weight: true
                    }
                })
            ]);

            if (!student) {
                return reply.code(404).send({
                    error: {
                        code: "STUDENT_NOT_FOUND",
                        message: "Student not found",
                        requestId: request.id
                    }
                });
            }

            const competencyWeights = new Map(
                competencies.map((competency) => [
                    competency.key,
                    competency.weight.toNumber()
                ])
            );

            const latestAttempts = REQUIRED_COMPETENCIES.map((key) => {
                const attempts = student.attempts
                    .filter(
                        (attempt) =>
                            attempt.competencyKey === key
                    )
                    .map((attempt) => ({
                        id: attempt.id,
                        submittedAt: attempt.submittedAt,
                        score: attempt.score.toNumber(),
                        voided: attempt.voided
                    }));

                const latestAttempt =
                    selectLatestValidAttempt(attempts);

                return {
                    key,
                    score: latestAttempt?.score ?? null,
                    weight: competencyWeights.get(key) ?? 0,
                    attemptId: latestAttempt?.id ?? null,
                    submittedAt:
                        latestAttempt?.submittedAt ?? null
                };
            });

            const readiness = calculateReadiness(
                latestAttempts.map((competency) => ({
                    key: competency.key,
                    score: competency.score,
                    weight: competency.weight
                }))
            );

            return {
                id: student.id,
                displayName: student.displayName,
                email: student.email,
                version: student.version,
                readiness,
                attempts: latestAttempts
            };
        }
    );
}