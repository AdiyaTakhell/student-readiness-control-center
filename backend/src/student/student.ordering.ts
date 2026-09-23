import type { Prisma } from "../generated/prisma/client.js";

type SortBy =
    | "displayName"
    | "readiness"
    | "currentScore"
    | "createdAt";

type SortOrder = "asc" | "desc";

export function buildStudentOrderBy(
    sortBy: SortBy,
    sortOrder: SortOrder
): Prisma.StudentOrderByWithRelationInput[] {
    if (sortBy === "currentScore") {
        return [
            {
                currentScore: {
                    sort: sortOrder,
                    nulls: "last"
                }
            },
            {
                id: "asc"
            }
        ];
    }

    return [
        {
            [sortBy]: sortOrder
        },
        {
            id: "asc"
        }
    ];
}