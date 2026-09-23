import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/auth.hooks.js";
import { authorize } from "../auth/authz.hooks.js";
import {
    updateStudentBodySchema,
    updateStudentParamsSchema
} from "./student.update.schemas.js";
import { updateStudent } from "./student.update.service.js";

export default async function studentUpdateRoutes(
    app: FastifyInstance
): Promise<void> {
    app.patch(
        "/api/students/:id",
        {
            preHandler: [
                authenticate,
                authorize("ADMIN")
            ]
        },
        async (request, reply) => {
            const paramsValidation =
                updateStudentParamsSchema.safeParse(
                    request.params
                );

            if (!paramsValidation.success) {
                return reply.code(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid student ID",
                        requestId: request.id,
                        fields:
                        paramsValidation.error.flatten()
                            .fieldErrors
                    }
                });
            }

            const bodyValidation =
                updateStudentBodySchema.safeParse(
                    request.body
                );

            if (!bodyValidation.success) {
                return reply.code(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request body",
                        requestId: request.id,
                        fields:
                        bodyValidation.error.flatten()
                            .fieldErrors
                    }
                });
            }

            try {
                const student = await updateStudent(
                    app.prisma,
                    {
                        tenantId:
                        request.user.tenantId,
                        studentId:
                        paramsValidation.data.id,
                        displayName:
                        bodyValidation.data.displayName,
                        expectedVersion:
                        bodyValidation.data
                            .expectedVersion
                    }
                );

                return reply.code(200).send({
                    id: student.id,
                    displayName: student.displayName,
                    email: student.email,
                    version: student.version,
                    currentScore:
                        student.currentScore?.toNumber() ??
                        null,
                    readiness: student.readiness
                });
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message ===
                    "STUDENT_UPDATE_CONFLICT"
                ) {
                    return reply.code(409).send({
                        error: {
                            code: "STUDENT_UPDATE_CONFLICT",
                            message:
                                "Student was modified by another request",
                            requestId: request.id
                        }
                    });
                }

                throw error;
            }
        }
    );
}