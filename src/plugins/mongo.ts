import fp from "fastify-plugin";
import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env.js";

export default fp(async (app) => {
    const client = new MongoClient(env.MONGODB_URL);

    await client.connect();

    const db = client.db(env.MONGODB_DATABASE);

    app.decorate("mongo", db);

    app.addHook("onClose", async () => {
        await client.close();
    });
});

declare module "fastify" {
    interface FastifyInstance {
        mongo: Db;
    }
}