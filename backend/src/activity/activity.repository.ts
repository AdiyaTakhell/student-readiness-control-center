import type { Db, Collection } from "mongodb";
import type {
    ActivityEvent,
    AttemptRejectedEvent,
    AttemptSucceededEvent,
} from "./activity.types.js";

export interface ActivityDocument {
    eventId: string;
    eventType: ActivityEvent["eventType"];
    tenantId: string;
    studentId: string | null;
    attemptId: string | null;
    requestId: string;
    occurredAt: Date;
    metadata:
        | AttemptSucceededEvent["metadata"]
        | AttemptRejectedEvent["metadata"];
}

export function getActivityCollection(
    db: Db,
): Collection<ActivityDocument> {
    return db.collection<ActivityDocument>("activity_events");
}

export async function storeActivityEvent(
    db: Db,
    event: ActivityEvent,
): Promise<void> {
    const collection = getActivityCollection(db);

    await collection.updateOne(
        {
            eventId: event.eventId,
        },
        {
            $setOnInsert: {
                eventId: event.eventId,
                eventType: event.eventType,
                tenantId: event.tenantId,
                studentId: event.studentId,
                attemptId: event.attemptId,
                requestId: event.requestId,
                occurredAt: new Date(event.occurredAt),
                metadata: event.metadata,
            },
        },
        {
            upsert: true,
        },
    );
}

export interface ActivityPage {
    items: ActivityDocument[];
    total: number;
}

export async function findStudentActivity(
    db: Db,
    tenantId: string,
    studentId: string,
    page: number,
    pageSize: number,
): Promise<ActivityPage> {
    const collection = getActivityCollection(db);

    const filter = {
        tenantId,
        studentId,
    };

    const [items, total] = await Promise.all([
        collection
            .find(filter)
            .sort({
                occurredAt: -1,
                eventId: -1,
            })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray(),

        collection.countDocuments(filter),
    ]);

    return {
        items,
        total,
    };
}