export const REQUIRED_COMPETENCIES = [
    "frontend",
    "backend",
    "databases",
    "problem_solving"
] as const;

export type CompetencyKey = (typeof REQUIRED_COMPETENCIES)[number];

export type ReadinessStatus =
    | "INCOMPLETE"
    | "READY"
    | "NEARLY_READY"
    | "DEVELOPING"
    | "NEEDS_PREPARATION";

export interface CompetencyScore {
    key: CompetencyKey;
    score: number | null;
    weight: number;
}

export interface ReadinessResult {
    score: number | null;
    status: ReadinessStatus;
}

export function calculateReadiness(
    scores: CompetencyScore[]
): ReadinessResult {
    const byKey = new Map(
        scores.map((entry) => [entry.key, entry])
    );

    const hasMissingRequiredCompetency = REQUIRED_COMPETENCIES.some(
        (key) => byKey.get(key)?.score == null
    );

    if (hasMissingRequiredCompetency) {
        return {
            score: null,
            status: "INCOMPLETE"
        };
    }

    const score = REQUIRED_COMPETENCIES.reduce((total, key) => {
        const entry = byKey.get(key)!;

        return total + entry.score! * entry.weight;
    }, 0);

    if (score >= 80) {
        return {
            score,
            status: "READY"
        };
    }

    if (score >= 65) {
        return {
            score,
            status: "NEARLY_READY"
        };
    }

    if (score >= 50) {
        return {
            score,
            status: "DEVELOPING"
        };
    }

    return {
        score,
        status: "NEEDS_PREPARATION"
    };
}