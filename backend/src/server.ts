import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { publishOutboxEvents } from "./activity/outbox.publisher.js";
const app = buildApp();

try {
    await app.listen({
        port: env.PORT,
        host: env.HOST
    });
    await publishOutboxEvents(app);
} catch (error) {
    app.log.error(error);
    process.exit(1);
}