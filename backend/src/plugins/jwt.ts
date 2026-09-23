import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { env } from "../config/env.js";

export interface AuthTokenPayload {
    sub: string;
    tenantId: string;
    role: "ADMIN" | "EVALUATOR" | "VIEWER";
}

export default fp(async (app) => {
    await app.register(fastifyJwt, {
        secret: env.JWT_SECRET
    });
});

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: AuthTokenPayload;
        user: AuthTokenPayload;
    }
}