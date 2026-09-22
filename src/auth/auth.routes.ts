import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {login} from "./auth.service.js";

const loginSchema = z.object({
    tenantSlug: z.string().trim().min(1).max(80),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1)
});

export default async function authRoutes(
    app: FastifyInstance
): Promise<void> {
    app.post(
        "/api/auth/login",
        async (request, reply) => {
            const validation = loginSchema.safeParse(request.body);

            if (!validation.success) {
                return reply.code(400).send({
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request body",
                        fields: validation.error.flatten().fieldErrors
                    }
                });
            }

            try {
                const loginResult = await login(
                    app,
                    app.prisma,
                    validation.data
                );

                return reply.code(200).send(loginResult);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === "INVALID_CREDENTIALS"
                ) {
                    return reply.code(401).send({
                        error: {
                            code: "INVALID_CREDENTIALS",
                            message: "Invalid credentials"
                        }
                    });
                }

                throw error;
            }
        }
    );
}