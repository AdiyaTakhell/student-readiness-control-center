import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getStudents } from "../api/client";
import type { ReadinessStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 10;

const readinessOptions: Array<
    ReadinessStatus | ""
> = [
    "",
    "READY",
    "NEARLY_READY",
    "DEVELOPING",
    "NEEDS_PREPARATION",
    "INCOMPLETE",
];

export default function StudentsPage() {
    const { token, logout } = useAuth();

    const [searchParams, setSearchParams] =
        useSearchParams();

    const search =
        searchParams.get("search") ?? "";

    const readiness =
        (searchParams.get(
            "readiness",
        ) as ReadinessStatus | null) ?? "";

    const page = Math.max(
        1,
        Number(searchParams.get("page") ?? "1"),
    );

    const studentsQuery = useQuery({
        queryKey: [
            "students",
            {
                page,
                search,
                readiness,
            },
        ],
        queryFn: () =>
            getStudents(
                {
                    page,
                    pageSize: PAGE_SIZE,
                    search: search || undefined,
                    readiness:
                        readiness || undefined,
                    sortBy: "displayName",
                    sortOrder: "asc",
                },
                token!,
            ),
        enabled: token !== null,
    });

    function updateSearch(
        value: string,
    ) {
        const next =
            new URLSearchParams(searchParams);

        if (value.trim()) {
            next.set(
                "search",
                value,
            );
        } else {
            next.delete("search");
        }

        next.set("page", "1");

        setSearchParams(next);
    }

    function updateReadiness(
        value: string,
    ) {
        const next =
            new URLSearchParams(searchParams);

        if (value) {
            next.set(
                "readiness",
                value,
            );
        } else {
            next.delete("readiness");
        }

        next.set("page", "1");

        setSearchParams(next);
    }

    function updatePage(
        nextPage: number,
    ) {
        const next =
            new URLSearchParams(searchParams);

        next.set(
            "page",
            String(nextPage),
        );

        setSearchParams(next);
    }

    if (studentsQuery.isLoading) {
        return (
            <main className="students-page">
                <p>Loading students...</p>
            </main>
        );
    }

    if (studentsQuery.isError) {
        return (
            <main className="students-page">
                <h1>Students</h1>

                <p role="alert">
                    Unable to load students.
                </p>

                <button
                    type="button"
                    onClick={() =>
                        studentsQuery.refetch()
                    }
                >
                    Retry
                </button>
            </main>
        );
    }

    const data =
        studentsQuery.data;

    const students =
        data?.data ?? [];

    const pagination =
        data?.pagination;

    return (
        <main className="students-page">
            <header className="page-header">
                <div>
                    <h1>
                        Student Readiness
                    </h1>

                    <p>
                        {pagination?.totalItems ??
                            0}{" "}
                        students
                    </p>
                </div>

                <button
                    type="button"
                    onClick={logout}
                >
                    Sign out
                </button>
            </header>

            <section className="students-toolbar">
                <input
                    type="search"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(event) =>
                        updateSearch(
                            event.target.value,
                        )
                    }
                    aria-label="Search students"
                />

                <select
                    value={readiness}
                    onChange={(event) =>
                        updateReadiness(
                            event.target.value,
                        )
                    }
                    aria-label="Filter by readiness"
                >
                    <option value="">
                        All readiness statuses
                    </option>

                    {readinessOptions
                        .filter(
                            (
                                option,
                            ) =>
                                option !== "",
                        )
                        .map((option) => (
                            <option
                                key={option}
                                value={option}
                            >
                                {option}
                            </option>
                        ))}
                </select>
            </section>

            <section className="students-card">
                {students.length === 0 ? (
                    <p>
                        No students found.
                    </p>
                ) : (
                    <table>
                        <thead>
                        <tr>
                            <th>
                                Student
                            </th>
                            <th>
                                Email
                            </th>
                            <th>
                                Score
                            </th>
                            <th>
                                Readiness
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                        {students.map(
                            (student) => (
                                <tr
                                    key={
                                        student.id
                                    }
                                >
                                    <td>
                                        <Link
                                            to={`/students/${student.id}`}
                                        >
                                            {
                                                student.displayName
                                            }
                                        </Link>
                                    </td>

                                    <td>
                                        {
                                            student.email
                                        }
                                    </td>

                                    <td>
                                        {student.currentScore ??
                                            "—"}
                                    </td>

                                    <td>
                                        {
                                            student.readiness
                                        }
                                    </td>
                                </tr>
                            ),
                        )}
                        </tbody>
                    </table>
                )}
            </section>

            {pagination &&
                pagination.totalPages >
                1 && (
                    <nav
                        aria-label="Student pagination"
                        className="pagination"
                    >
                        <button
                            type="button"
                            disabled={
                                page <= 1
                            }
                            onClick={() =>
                                updatePage(
                                    page - 1,
                                )
                            }
                        >
                            Previous
                        </button>

                        <span>
                            Page {page} of{" "}
                            {
                                pagination.totalPages
                            }
                        </span>

                        <button
                            type="button"
                            disabled={
                                page >=
                                pagination.totalPages
                            }
                            onClick={() =>
                                updatePage(
                                    page + 1,
                                )
                            }
                        >
                            Next
                        </button>
                    </nav>
                )}
        </main>
    );
}