import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    useState,
    type FormEvent,
} from "react";
import {
    Link,
    useParams,
} from "react-router-dom";

import {
    ApiRequestError,
    createAttempt,
    getStudent,
    getStudentActivity,
} from "../api/client";

import type {
    CompetencyKey,
} from "../api/types";

import {useAuth} from "../auth/AuthContext";

const ACTIVITY_PAGE_SIZE = 10;

function formatCompetencyName(
    key: string,
): string {
    return key
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase(),
        );
}

export default function StudentDetailPage() {
    const {id} =
        useParams<{
            id: string;
        }>();

    const {token} =
        useAuth();

    const queryClient =
        useQueryClient();

    const [
        competency,
        setCompetency,
    ] = useState<CompetencyKey>(
        "frontend",
    );

    const [
        score,
        setScore,
    ] = useState("");

    const [
        attemptError,
        setAttemptError,
    ] = useState<string | null>(
        null,
    );

    /*
     * Keep the same idempotency key when
     * retrying the exact same request.
     */
    const [
        idempotencyKey,
        setIdempotencyKey,
    ] = useState<string | null>(
        null,
    );

    /*
     * Store the request body associated
     * with the current idempotency key.
     */
    const [
        submittedAttempt,
        setSubmittedAttempt,
    ] = useState<{
        competency: CompetencyKey;
        score: number;
    } | null>(null);

    const [
        activityPage,
        setActivityPage,
    ] = useState(1);

    const studentQuery =
        useQuery({
            queryKey: [
                "student",
                id,
            ],
            queryFn: () =>
                getStudent(
                    id!,
                    token!,
                ),
            enabled:
                token !== null &&
                id !== undefined,
        });

    const activityQuery =
        useQuery({
            queryKey: [
                "student-activity",
                id,
                activityPage,
            ],
            queryFn: () =>
                getStudentActivity(
                    id!,
                    activityPage,
                    ACTIVITY_PAGE_SIZE,
                    token!,
                ),
            enabled:
                token !== null &&
                id !== undefined,
        });

    const createAttemptMutation =
        useMutation({
            mutationFn: async () => {
                if (
                    !token ||
                    !id
                ) {
                    throw new Error(
                        "Missing authentication information.",
                    );
                }

                const parsedScore =
                    Number(score);

                /*
                 * Generate the key only once.
                 * If the request fails, the same key
                 * is reused for a safe retry.
                 */
                const key =
                    idempotencyKey ??
                    crypto.randomUUID();

                if (
                    !idempotencyKey
                ) {
                    setIdempotencyKey(
                        key,
                    );
                }

                setSubmittedAttempt({
                    competency,
                    score: parsedScore,
                });

                return createAttempt(
                    id,
                    {
                        competencyKey:
                        competency,
                        score:
                        parsedScore,
                    },
                    key,
                    token,
                );
            },

            onSuccess:
                async () => {
                    setScore("");

                    setIdempotencyKey(
                        null,
                    );

                    setSubmittedAttempt(
                        null,
                    );

                    setAttemptError(
                        null,
                    );

                    /*
                     * Refresh both the student state
                     * and the activity feed.
                     */
                    await Promise.all([
                        queryClient.invalidateQueries(
                            {
                                queryKey: [
                                    "student",
                                    id,
                                ],
                            },
                        ),

                        queryClient.invalidateQueries(
                            {
                                queryKey: [
                                    "student-activity",
                                    id,
                                ],
                            },
                        ),
                    ]);
                },

            onError: (
                error,
            ) => {
                if (
                    error instanceof
                    ApiRequestError
                ) {
                    setAttemptError(
                        error.details
                            .error
                            .message,
                    );

                    return;
                }

                setAttemptError(
                    "Unable to submit attempt.",
                );
            },
        });

    function handleAttemptSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setAttemptError(null);

        const parsedScore =
            Number(score);

        if (
            !Number.isFinite(
                parsedScore,
            ) ||
            parsedScore < 0 ||
            parsedScore > 100
        ) {
            setAttemptError(
                "Score must be between 0 and 100.",
            );

            return;
        }

        /*
         * If there is an existing idempotency key,
         * the form represents a retry.
         *
         * The fields are disabled while that key
         * exists, so the request body cannot change.
         */
        if (
            idempotencyKey !== null &&
            submittedAttempt !== null
        ) {
            if (
                submittedAttempt
                    .competency !==
                competency ||
                submittedAttempt.score !==
                parsedScore
            ) {
                setAttemptError(
                    "The previous request must be retried with the same competency and score.",
                );

                return;
            }
        }

        createAttemptMutation.mutate();
    }

    if (
        studentQuery.isLoading
    ) {
        return (
            <main className="student-detail-page">
                <p>
                    Loading student...
                </p>
            </main>
        );
    }

    if (
        studentQuery.isError
    ) {
        const error =
            studentQuery.error;

        let message =
            "Unable to load student.";

        if (
            error instanceof
            ApiRequestError
        ) {
            message =
                error.details
                    .error
                    .message;
        }

        return (
            <main className="student-detail-page">
                <Link to="/students">
                    ← Back to students
                </Link>

                <h1>
                    Student details
                </h1>

                <p role="alert">
                    {message}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        studentQuery.refetch()
                    }
                >
                    Retry
                </button>
            </main>
        );
    }

    const student =
        studentQuery.data;

    if (!student) {
        return (
            <main className="student-detail-page">
                <Link to="/students">
                    ← Back to students
                </Link>

                <p role="alert">
                    Student data is
                    unavailable.
                </p>
            </main>
        );
    }

    const activity =
        activityQuery.data;

    const totalActivityPages =
        activity
            ? Math.ceil(
                activity.total /
                activity.pageSize,
            )
            : 0;

    const attemptInProgress =
        createAttemptMutation.isPending;

    const retryingAttempt =
        idempotencyKey !== null;

    return (
        <main className="student-detail-page">
            <Link to="/students">
                ← Back to students
            </Link>

            <header className="student-detail-header">
                <div>
                    <h1>
                        {
                            student.displayName
                        }
                    </h1>

                    <p>
                        {student.email}
                    </p>
                </div>

                <div className="readiness-summary">
                    <strong>
                        {
                            student
                                .readiness
                                .score ??
                            "—"
                        }
                    </strong>

                    <span>
                        {
                            student
                                .readiness
                                .status
                        }
                    </span>
                </div>
            </header>

            <section className="student-detail-section">
                <h2>
                    Competencies
                </h2>

                <div className="competency-grid">
                    {student.attempts.map(
                        (
                            competency,
                        ) => (
                            <article
                                key={
                                    competency.key
                                }
                                className="competency-card"
                            >
                                <h3>
                                    {formatCompetencyName(
                                        competency.key,
                                    )}
                                </h3>

                                <p>
                                    Score:{" "}
                                    <strong>
                                        {
                                            competency
                                                .score ??
                                            "—"
                                        }
                                    </strong>
                                </p>

                                <p>
                                    Weight: {(competency.weight * 100).toFixed(0)}%
                                </p>

                                <p>
                                    Submitted:{" "}
                                    {competency.submittedAt
                                        ? new Date(
                                            competency.submittedAt,
                                        ).toLocaleString()
                                        : "No attempt"}
                                </p>
                            </article>
                        ),
                    )}
                </div>
            </section>

            <section className="student-detail-section">
                <h2>
                    Activity
                </h2>

                {activityQuery.isLoading && (
                    <p>
                        Loading activity...
                    </p>
                )}

                {activityQuery.isError && (
                    <div>
                        <p
                            role="alert"
                            className="form-error"
                        >
                            Unable to load
                            activity.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                activityQuery.refetch()
                            }
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!activityQuery.isLoading &&
                    !activityQuery.isError &&
                    activity &&
                    activity.items
                        .length === 0 && (
                        <p>
                            No activity
                            recorded.
                        </p>
                    )}

                {activity &&
                    activity.items
                        .length > 0 && (
                        <>
                            <div className="activity-list">
                                {activity.items.map(
                                    (
                                        event,
                                    ) => (
                                        <article
                                            key={
                                                event.eventId
                                            }
                                            className="activity-item"
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        event.eventType
                                                    }
                                                </strong>

                                                <p>
                                                    {new Date(
                                                        event.occurredAt,
                                                    ).toLocaleString()}
                                                </p>
                                            </div>

                                            {event.attemptId && (
                                                <p>
                                                    Attempt:{" "}
                                                    {
                                                        event.attemptId
                                                    }
                                                </p>
                                            )}
                                        </article>
                                    ),
                                )}
                            </div>

                            {totalActivityPages >
                                1 && (
                                    <nav
                                        aria-label="Activity pagination"
                                        className="pagination"
                                    >
                                        <button
                                            type="button"
                                            disabled={
                                                activityPage <=
                                                1
                                            }
                                            onClick={() =>
                                                setActivityPage(
                                                    (
                                                        current,
                                                    ) =>
                                                        current -
                                                        1,
                                                )
                                            }
                                        >
                                            Previous
                                        </button>

                                        <span>
                                        Page{" "}
                                            {
                                                activityPage
                                            }{" "}
                                            of{" "}
                                            {
                                                totalActivityPages
                                            }
                                    </span>

                                        <button
                                            type="button"
                                            disabled={
                                                activityPage >=
                                                totalActivityPages
                                            }
                                            onClick={() =>
                                                setActivityPage(
                                                    (
                                                        current,
                                                    ) =>
                                                        current +
                                                        1,
                                                )
                                            }
                                        >
                                            Next
                                        </button>
                                    </nav>
                                )}
                        </>
                    )}
            </section>

            <section className="student-detail-section">
                <h2>
                    Add Attempt
                </h2>

                {retryingAttempt && (
                    <p>
                        The previous submission
                        did not complete. Retry
                        the same request safely.
                    </p>
                )}

                <form
                    className="attempt-form"
                    onSubmit={
                        handleAttemptSubmit
                    }
                >
                    <label>
                        Competency

                        <select
                            value={
                                competency
                            }
                            onChange={(
                                event,
                            ) =>
                                setCompetency(
                                    event
                                        .target
                                        .value as CompetencyKey,
                                )
                            }
                            disabled={
                                attemptInProgress ||
                                retryingAttempt
                            }
                        >
                            <option value="frontend">
                                Frontend
                            </option>

                            <option value="backend">
                                Backend
                            </option>

                            <option value="databases">
                                Databases
                            </option>

                            <option value="problem_solving">
                                Problem Solving
                            </option>
                        </select>
                    </label>

                    <label>
                        Score

                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={
                                score
                            }
                            onChange={(
                                event,
                            ) =>
                                setScore(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                            disabled={
                                attemptInProgress ||
                                retryingAttempt
                            }
                        />
                    </label>

                    {attemptError && (
                        <p
                            role="alert"
                            className="form-error"
                        >
                            {
                                attemptError
                            }
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            attemptInProgress
                        }
                    >
                        {attemptInProgress
                            ? "Submitting..."
                            : retryingAttempt
                                ? "Retry Attempt"
                                : "Submit Attempt"}
                    </button>
                </form>
            </section>

            <section className="student-detail-section">
                <h2>
                    Student Information
                </h2>

                <p>
                    Version:{" "}
                    {student.version}
                </p>
            </section>
        </main>
    );
}