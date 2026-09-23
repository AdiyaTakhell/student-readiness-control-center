import { z } from "zod";

export const studentListQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),

    readiness: z
        .enum([
            "INCOMPLETE",
            "READY",
            "NEARLY_READY",
            "DEVELOPING",
            "NEEDS_PREPARATION"
        ])
        .optional(),

    sortBy: z
        .enum([
            "displayName",
            "readiness",
            "currentScore",
            "createdAt"
        ])
        .default("displayName"),

    sortOrder: z
        .enum(["asc", "desc"])
        .default("asc"),

    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
});

export type StudentListQuery = z.infer<
    typeof studentListQuerySchema
>;