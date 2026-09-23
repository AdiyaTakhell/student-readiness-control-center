import { z } from "zod";

export const activityParamsSchema = z.object({
    id: z.string().regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        "Invalid UUID"
    )
});

export const activityQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type ActivityParams = z.infer<typeof activityParamsSchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;