export type ReadinessStatus =
    | "INCOMPLETE"
    | "READY"
    | "NEARLY_READY"
    | "DEVELOPING"
    | "NEEDS_PREPARATION";

export interface LoginRequest {
    tenantSlug: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        requestId: string;
        fields?: Record<string, string[]>;
    };
}

export interface StudentSummary {
    id: string;
    displayName: string;
    email: string;
    currentScore: number | null;
    readiness: ReadinessStatus;
}

export interface StudentListResponse {
    data: StudentSummary[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}

export interface StudentListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    readiness?: ReadinessStatus;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface StudentCompetency {
    key: string;
    score: number | null;
    weight: number;
    attemptId: string | null;
    submittedAt: string | null;
}

export interface StudentReadiness {
    score: number | null;
    status: ReadinessStatus;
}

export interface StudentDetailResponse {
    id: string;
    displayName: string;
    email: string;
    version: number;
    readiness: StudentReadiness;
    attempts: StudentCompetency[];
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        requestId: string;
        fields?: Record<string, string[]>;
    };
}

export type CompetencyKey =
    | "frontend"
    | "backend"
    | "databases"
    | "problem_solving";

export interface CreateAttemptRequest {
    competencyKey: CompetencyKey;
    score: number;
}

export interface CreateAttemptResponse {
    attempt: {
        id: string;
        studentId: string;
        competencyKey: CompetencyKey;
        score: number;
    };
    readiness: StudentReadiness;
    version: number;
}

export interface ActivityEvent {
    eventId: string;
    eventType: string;
    attemptId: string | null;
    requestId: string;
    occurredAt: string;
    metadata: Record<string, unknown>;
}

export interface StudentActivityResponse {
    items: ActivityEvent[];
    page: number;
    pageSize: number;
    total: number;
}