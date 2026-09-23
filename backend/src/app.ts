import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Db } from "mongodb";
import type { PrismaClient } from "./generated/prisma/client.js";
import type { FastifyError } from "fastify";

import authRoutes from "./auth/auth.routes.js";
import { env } from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import mongoPlugin from "./plugins/mongo.js";
import jwtPlugin from "./plugins/jwt.js";
import authMeRoutes from "./auth/auth.me.routes.js";
import authzTestRoutes from "./auth/authz.test.routes.js";
import studentRoutes from "./student/student.routes.js";
import studentDetailRoutes from "./student/student.detail.routes.js";
import { studentAttemptRoutes } from "./student/student.attempt.routes.js";
import studentUpdateRoutes from "./student/student.update.routes.js";
import activityRoutes from "./activity/activity.routes.js";

interface AppDependencies {
    prisma?: PrismaClient;
    mongo?: Db;
}

export function buildApp(
    dependencies: AppDependencies = {},
) {
    const app = Fastify({
        logger: true,
        requestIdHeader: "x-request-id",
    });

    app.register(cors, {
        origin: env.CORS_ORIGIN,
        credentials: true,
    });

    if (dependencies.prisma) {
        app.register(prismaPlugin, {
            client: dependencies.prisma,
        });
    } else {
        app.register(prismaPlugin);
    }

    if (dependencies.mongo) {
        app.register(mongoPlugin, {
            db: dependencies.mongo,
        });
    } else {
        app.register(mongoPlugin);
    }

    app.register(jwtPlugin);

    app.register(authRoutes);
    app.register(authMeRoutes);
    app.register(authzTestRoutes);
    app.register(studentRoutes);
    app.register(studentDetailRoutes);
    app.register(studentAttemptRoutes);
    app.register(studentUpdateRoutes);
    app.register(activityRoutes);

    app.get("/health", async () => {
        return {
            status: "ok",
        };
    });

    app.setNotFoundHandler((request, reply) => {
        return reply.status(404).send({
            error: {
                code: "ROUTE_NOT_FOUND",
                message: "Route not found",
                requestId: request.id,
            },
        });
    });

    app.setErrorHandler(
        (error: FastifyError, request, reply) => {
            if (error.code === "FST_ERR_VALIDATION") {
                request.log.warn(
                    {
                        requestId: request.id,
                        code: error.code,
                    },
                    "Request validation failed",
                );

                return reply.status(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message:
                            "Request validation failed",
                        requestId: request.id,
                        fields:
                            error.validation?.map(
                                (field) => ({
                                    field: field
                                        .instancePath
                                        ? field.instancePath.replace(
                                            /^\//,
                                            "",
                                        )
                                        : field.params
                                            ?.missingProperty ??
                                        "request",
                                    message:
                                    field.message,
                                }),
                            ),
                    },
                });
            }

            if (
                error.message ===
                "STUDENT_NOT_FOUND"
            ) {
                request.log.warn(
                    {
                        requestId: request.id,
                        code: "STUDENT_NOT_FOUND",
                    },
                    "Student not found",
                );

                return reply.status(404).send({
                    error: {
                        code: "STUDENT_NOT_FOUND",
                        message: "Student not found",
                        requestId: request.id,
                    },
                });
            }

            if (
                error.message ===
                "COMPETENCY_NOT_FOUND"
            ) {
                request.log.warn(
                    {
                        requestId: request.id,
                        code: "COMPETENCY_NOT_FOUND",
                    },
                    "Required competency not found",
                );

                return reply.status(400).send({
                    error: {
                        code: "COMPETENCY_NOT_FOUND",
                        message:
                            "Required competency not found",
                        requestId: request.id,
                    },
                });
            }

            if (
                error.message ===
                "EVALUATOR_NOT_FOUND"
            ) {
                request.log.warn(
                    {
                        requestId: request.id,
                        code: "EVALUATOR_NOT_FOUND",
                    },
                    "Evaluator is not authorized for this tenant",
                );

                return reply.status(403).send({
                    error: {
                        code: "EVALUATOR_NOT_FOUND",
                        message:
                            "Evaluator is not authorized for this tenant",
                        requestId: request.id,
                    },
                });
            }

            if (
                error.message ===
                "IDEMPOTENCY_KEY_REUSED"
            ) {
                request.log.warn(
                    {
                        requestId: request.id,
                        code: "IDEMPOTENCY_KEY_REUSED",
                    },
                    "Idempotency key was reused",
                );

                return reply.status(409).send({
                    error: {
                        code:
                            "IDEMPOTENCY_KEY_REUSED",
                        message:
                            "Idempotency key was already used with a different request",
                        requestId: request.id,
                    },
                });
            }

            request.log.error(
                {
                    err: error,
                    requestId: request.id,
                },
                "Unexpected request error",
            );

            return reply.status(500).send({
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message:
                        "An unexpected error occurred",
                    requestId: request.id,
                },
            });
        },
    );

    return app;
}