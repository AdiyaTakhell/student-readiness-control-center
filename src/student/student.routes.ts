import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/auth.hooks.js";
import { studentListQuerySchema } from "./student.schemas.js";
import { buildStudentOrderBy } from "./student.ordering.js";

export default async function studentRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/api/students",
        {
            preHandler: authenticate
        },
        async (request, reply) => {
            const validation = studentListQuerySchema.safeParse(
                request.query
            );

            if (!validation.success) {
                return reply.code(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid query parameters",
                        requestId: request.id,
                        fields: validation.error.flatten().fieldErrors
                    }
                });
            }

            const {
                page,
                pageSize,
                search,
                readiness,
                sortBy,
                sortOrder
            } = validation.data;

            const where = {
                tenantId: request.user.tenantId,
                ...(readiness ? { readiness } : {}),
                ...(search
                    ? {
                        OR: [
                            {
                                displayName: {
                                    contains: search,
                                    mode: "insensitive" as const
                                }
                            },
                            {
                                email: {
                                    contains: search,
                                    mode: "insensitive" as const
                                }
                            }
                        ]
                    }
                    : {})
            };

            const [students, totalItems] = await Promise.all([
                app.prisma.student.findMany({
                    where,
                    orderBy: buildStudentOrderBy(
                        sortBy,
                        sortOrder
                    ),
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        currentScore: true,
                        readiness: true
                    }
                }),

                app.prisma.student.count({
                    where
                })
            ]);

            return {
                data: students.map((student) => ({
                    ...student,
                    currentScore:
                        student.currentScore?.toNumber() ?? null
                })),
                pagination: {
                    page,
                    pageSize,
                    totalItems,
                    totalPages: Math.ceil(
                        totalItems / pageSize
                    )
                }
            };
        }
    );
}