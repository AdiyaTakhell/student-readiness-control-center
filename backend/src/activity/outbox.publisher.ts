import type { FastifyInstance } from "fastify";
import type { ActivityEvent } from "./activity.types.js";
import { storeActivityEvent } from "./activity.repository.js";

export async function publishOutboxEvents(
    app: FastifyInstance,
): Promise<void> {
    const events = await app.prisma.outboxEvent.findMany({
        where: {
            publishedAt: null,
        },
        orderBy: {
            createdAt: "asc",
        },
        take: 50,
    });

    for (const event of events) {
        const activityEvent =
            event.payload as unknown as ActivityEvent;

        await storeActivityEvent(
            app.mongo,
            activityEvent,
        );

        await app.prisma.outboxEvent.update({
            where: {
                id: event.id,
            },
            data: {
                publishedAt: new Date(),
            },
        });
    }
}