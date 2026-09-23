import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../auth/auth.hooks.js";
import {
    activityParamsSchema,
    activityQuerySchema
} from "./activity.schemas.js";
import { getStudentActivity } from "./activity.service.js";

const activityRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/api/students/:id/activity",
        {
            preHandler: [authenticate]
        },
        async (request, reply) => {
            const paramsResult = activityParamsSchema.safeParse(
                request.params
            );

            const queryResult = activityQuerySchema.safeParse(
                request.query
            );

            if (
                !paramsResult.success ||
                !queryResult.success
            ) {
                return reply.status(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request",
                        requestId: request.id
                    }
                });
            }

            try {
                const result = await getStudentActivity(
                    app.prisma,
                    app.mongo,
                    {
                        tenantId: request.user.tenantId,
                        studentId: paramsResult.data.id,
                        page: queryResult.data.page,
                        pageSize: queryResult.data.pageSize
                    }
                );

                return reply.send({
                    items: result.items.map((item) => ({
                        eventId: item.eventId,
                        eventType: item.eventType,
                        attemptId: item.attemptId,
                        requestId: item.requestId,
                        occurredAt:
                            item.occurredAt.toISOString(),
                        metadata: item.metadata
                    })),
                    page: queryResult.data.page,
                    pageSize: queryResult.data.pageSize,
                    total: result.total
                });
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === "STUDENT_NOT_FOUND"
                ) {
                    return reply.status(404).send({
                        error: {
                            code: "STUDENT_NOT_FOUND",
                            message: "Student not found",
                            requestId: request.id
                        }
                    });
                }

                throw error;
            }
        }
    );
};

export default activityRoutes;