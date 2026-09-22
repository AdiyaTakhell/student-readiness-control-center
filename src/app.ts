import Fastify from "fastify";
import cors from "@fastify/cors";
import authRoutes from "./auth/auth.routes.js";
import {env} from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import mongoPlugin from "./plugins/mongo.js";
import jwtPlugin from "./plugins/jwt.js";
import authMeRoutes from "./auth/auth.me.routes.js";

export function buildApp() {
    const app = Fastify({
        logger: true,
        requestIdHeader: "x-request-id"
    });

    app.register(cors, {
        origin: env.CORS_ORIGIN,
        credentials: true
    });
    app.register(prismaPlugin);
    app.register(mongoPlugin);
    app.register(jwtPlugin);
    app.register(authRoutes);
    app.register(authMeRoutes);
    app.get("/health", async () => {
        return {
            status: "ok"
        };
    });

    return app;
}