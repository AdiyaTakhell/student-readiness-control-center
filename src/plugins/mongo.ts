import fp from "fastify-plugin";
import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env.js";

export interface MongoPluginOptions {
    db?: Db;
}

export default fp<MongoPluginOptions>(async (app, options) => {
    let client: MongoClient | undefined;

    const db =
        options.db ??
        (() => {
            client = new MongoClient(env.MONGODB_URL);
            return client.db(env.MONGODB_DATABASE);
        })();

    if (client) {
        await client.connect();
    }

    const activityEvents = db.collection("activity_events");

    await activityEvents.createIndex(
        { eventId: 1 },
        { unique: true }
    );

    await activityEvents.createIndex({
        tenantId: 1,
        studentId: 1,
        occurredAt: -1
    });

    app.decorate("mongo", db);

    app.addHook("onClose", async () => {
        if (client) {
            await client.close();
        }
    });
});

declare module "fastify" {
    interface FastifyInstance {
        mongo: Db;
    }
}