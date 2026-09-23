import type { FastifyInstance } from "fastify";
import { authenticate } from "./auth.hooks.js";

export default async function authMeRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/api/auth/me",
        {
            preHandler: authenticate
        },
        async (request) => {
            return {
                userId: request.user.sub,
                tenantId: request.user.tenantId,
                role: request.user.role
            };
        }
    );
}