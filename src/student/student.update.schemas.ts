import { z } from "zod";

export const updateStudentParamsSchema = z.object({
    id: z.string().regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        "Invalid UUID"
    )
});

export const updateStudentBodySchema = z.object({
    displayName: z
        .string()
        .trim()
        .min(1)
        .max(160),

    expectedVersion: z
        .number()
        .int()
        .min(1)
});

export type UpdateStudentBody = z.infer<
    typeof updateStudentBodySchema
>;