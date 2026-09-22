import Fastify from "fastify";
import cors from "@fastify/cors";

import { env } from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import mongoPlugin from "./plugins/mongo.js";

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

    app.get("/health", async () => {
        return {
            status: "ok"
        };
    });

    return app;
}