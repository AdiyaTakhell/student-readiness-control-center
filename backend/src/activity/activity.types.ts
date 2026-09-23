export const ACTIVITY_EVENT_TYPES = {
    ATTEMPT_SUCCEEDED: "ATTEMPT_SUCCEEDED",
    ATTEMPT_REJECTED: "ATTEMPT_REJECTED",
} as const;

export type ActivityEventType =
    (typeof ACTIVITY_EVENT_TYPES)[keyof typeof ACTIVITY_EVENT_TYPES];

export interface AttemptSucceededEventMetadata {
    competencyKey: string;
    score: number;
    readinessScore: number | null;
    readinessStatus:
        | "INCOMPLETE"
        | "READY"
        | "NEARLY_READY"
        | "DEVELOPING"
        | "NEEDS_PREPARATION";
}

export interface AttemptSucceededEvent {
    eventId: string;
    eventType: "ATTEMPT_SUCCEEDED";
    tenantId: string;
    studentId: string;
    attemptId: string;
    requestId: string;
    occurredAt: string;
    metadata: AttemptSucceededEventMetadata;
}

export interface AttemptRejectedEventMetadata {
    reasonCode: string;
}

export interface AttemptRejectedEvent {
    eventId: string;
    eventType: "ATTEMPT_REJECTED";
    tenantId: string;
    studentId: string | null;
    attemptId: null;
    requestId: string;
    occurredAt: string;
    metadata: AttemptRejectedEventMetadata;
}

export type ActivityEvent =
    | AttemptSucceededEvent
    | AttemptRejectedEvent;