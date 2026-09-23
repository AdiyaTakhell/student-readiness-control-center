import type {FastifyInstance} from "fastify";
import {authenticate} from "./auth.hooks.js";
import {authorize} from "./authz.hooks.js";

export default async function authzTestRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/api/auth/admin-check",
        {
            preHandler: [
                authenticate,
                authorize("ADMIN")
            ]
        },
        async () => {
            return {
                message: "Admin access granted"
            };
        }
    );
    app.get(
        "/api/auth/tenant-check/:studentId",
        {
            preHandler: authenticate
        },
        async (request, reply) => {
            const {studentId} = request.params as {
                studentId: string;
            };

            const student = await app.prisma.student.findFirst({
                where: {
                    id: studentId,
                    tenantId: request.user.tenantId
                }
            });

            if (!student) {
                return reply.code(404).send({
                    error: {
                        code: "STUDENT_NOT_FOUND",
                        message: "Student not found"
                    }
                });
            }

            return {
                id: student.id,
                displayName: student.displayName,
                tenantId: student.tenantId
            };
        }
    );
}