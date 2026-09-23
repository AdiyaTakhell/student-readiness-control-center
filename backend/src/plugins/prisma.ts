import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

export interface PrismaPluginOptions {
    client?: PrismaClient;
}

export default fp<PrismaPluginOptions>(async (app, options) => {
    const prisma =
        options.client ??
        new PrismaClient({
            adapter: new PrismaPg({
                connectionString: env.DATABASE_URL
            })
        });

    await prisma.$connect();

    app.decorate("prisma", prisma);

    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
});

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}