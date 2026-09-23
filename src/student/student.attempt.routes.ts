import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/auth.hooks.js";
import { authorize } from "../auth/authz.hooks.js";
import {
    createAttemptParamsSchema,
    createAttemptBodySchema,
} from "./student.attempt.schemas.js";
import { createAttempt } from "./student.attempt.service.js";

interface CreateAttemptParams {
    id: string;
}

interface CreateAttemptBody {
    competencyKey: string;
    score: number;
}

export async function studentAttemptRoutes(app: FastifyInstance) {
    app.post<{
        Params: CreateAttemptParams;
        Body: CreateAttemptBody;
    }>(
        "/api/students/:id/attempts",
        {
            preHandler: [
                authenticate,
                authorize("ADMIN", "EVALUATOR"),
            ],
            schema: {
                params: createAttemptParamsSchema,
                body: createAttemptBodySchema,
            },
        },
        async (request, reply) => {
            const result = await createAttempt(
                app.prisma,
                {
                    tenantId: request.user.tenantId,
                    studentId: request.params.id,
                    competencyKey: request.body.competencyKey,
                    evaluatorId: request.user.sub,
                    score: request.body.score,
                    idempotencyKey:
                        request.headers["idempotency-key"] as string,
                    requestId: request.id,
                },
            );

            return reply.code(201).send(result);
        },
    );
}