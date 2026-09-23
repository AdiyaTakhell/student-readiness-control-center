import { REQUIRED_COMPETENCIES } from "../domain/readiness.js";

export const createAttemptBodySchema = {
    type: "object",
    required: ["competencyKey", "score"],
    additionalProperties: false,
    properties: {
        competencyKey: {
            type: "string",
            enum: [...REQUIRED_COMPETENCIES]
        },
        score: {
            type: "number",
            minimum: 0,
            maximum: 100
        }
    }
} as const;

export const createAttemptParamsSchema = {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    properties: {
        id: {
            type: "string",
            pattern:
                "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
        }
    }
} as const;

export type CreateAttemptBody = {
    competencyKey: (typeof REQUIRED_COMPETENCIES)[number];
    score: number;
};