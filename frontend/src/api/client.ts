import type {
    ApiError,
    CreateAttemptRequest,
    CreateAttemptResponse,
    LoginRequest,
    LoginResponse,
    StudentActivityResponse,
    StudentDetailResponse,
    StudentListParams,
    StudentListResponse,
} from "./types";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error(
        "VITE_API_BASE_URL is not configured",
    );
}

class ApiRequestError extends Error {
    status: number;
    details: ApiError;

    constructor(
        status: number,
        details: ApiError,
    ) {
        super(details.error.message);
        this.name = "ApiRequestError";
        this.status = status;
        this.details = details;
    }
}

async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        },
    );

    const body = await response.json();

    if (!response.ok) {
        throw new ApiRequestError(
            response.status,
            body,
        );
    }

    return body as T;
}

export async function login(
    data: LoginRequest,
): Promise<LoginResponse> {
    return request<LoginResponse>(
        "/api/auth/login",
        {
            method: "POST",
            body: JSON.stringify(data),
        },
    );
}

export async function getStudents(
    params: StudentListParams = {},
    token: string,
): Promise<StudentListResponse> {
    const searchParams =
        new URLSearchParams();

    if (params.page !== undefined) {
        searchParams.set(
            "page",
            String(params.page),
        );
    }

    if (params.pageSize !== undefined) {
        searchParams.set(
            "pageSize",
            String(params.pageSize),
        );
    }

    if (params.search) {
        searchParams.set(
            "search",
            params.search,
        );
    }

    if (params.readiness) {
        searchParams.set(
            "readiness",
            params.readiness,
        );
    }

    if (params.sortBy) {
        searchParams.set(
            "sortBy",
            params.sortBy,
        );
    }

    if (params.sortOrder) {
        searchParams.set(
            "sortOrder",
            params.sortOrder,
        );
    }

    const query =
        searchParams.toString();

    return request<StudentListResponse>(
        `/api/students${query ? `?${query}` : ""}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );
}

export async function getStudent(
    studentId: string,
    token: string,
): Promise<StudentDetailResponse> {
    return request<StudentDetailResponse>(
        `/api/students/${studentId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );
}

export async function getStudentActivity(
    studentId: string,
    page: number,
    pageSize: number,
    token: string,
): Promise<StudentActivityResponse> {
    const searchParams =
        new URLSearchParams();

    searchParams.set(
        "page",
        String(page),
    );

    searchParams.set(
        "pageSize",
        String(pageSize),
    );

    return request<StudentActivityResponse>(
        `/api/students/${studentId}/activity?${searchParams.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );
}

export async function createAttempt(
    studentId: string,
    data: CreateAttemptRequest,
    idempotencyKey: string,
    token: string,
): Promise<CreateAttemptResponse> {
    return request<CreateAttemptResponse>(
        `/api/students/${studentId}/attempts`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Idempotency-Key":
                idempotencyKey,
            },
            body: JSON.stringify(data),
        },
    );
}

export { ApiRequestError };