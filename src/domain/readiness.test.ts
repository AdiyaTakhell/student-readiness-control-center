import {describe, expect, it} from "vitest";
import {
    calculateReadiness,
    type CompetencyScore
} from "./readiness.js";

const completeScores: CompetencyScore[] = [
    {
        key: "frontend",
        score: 80,
        weight: 0.30
    },
    {
        key: "backend",
        score: 80,
        weight: 0.30
    },
    {
        key: "databases",
        score: 80,
        weight: 0.25
    },
    {
        key: "problem_solving",
        score: 80,
        weight: 0.15
    }
];

describe("calculateReadiness", () => {
    it("returns INCOMPLETE when a required competency is missing", () => {
        const scores = completeScores.map((entry) =>
            entry.key === "databases"
                ? {...entry, score: null}
                : entry
        );

        expect(calculateReadiness(scores)).toEqual({
            score: null,
            status: "INCOMPLETE"
        });
    });

    it("calculates the weighted score correctly", () => {
        const scores: CompetencyScore[] = [
            {key: "frontend", score: 100, weight: 0.30},
            {key: "backend", score: 80, weight: 0.30},
            {key: "databases", score: 60, weight: 0.25},
            {key: "problem_solving", score: 40, weight: 0.15}
        ];

        expect(calculateReadiness(scores)).toEqual({
            score: 75,
            status: "NEARLY_READY"
        });
    });

    it("returns READY at exactly 80", () => {
        const scores = completeScores.map((entry) => ({
            ...entry,
            score: 80
        }));

        expect(calculateReadiness(scores)).toEqual({
            score: 80,
            status: "READY"
        });
    });

    it("returns NEARLY_READY at exactly 65", () => {
        const scores = completeScores.map((entry) => ({
            ...entry,
            score: 65
        }));

        expect(calculateReadiness(scores)).toEqual({
            score: 65,
            status: "NEARLY_READY"
        });
    });

    it("returns DEVELOPING at exactly 50", () => {
        const scores = completeScores.map((entry) => ({
            ...entry,
            score: 50
        }));

        expect(calculateReadiness(scores)).toEqual({
            score: 50,
            status: "DEVELOPING"
        });
    });

    it("returns NEEDS_PREPARATION below 50", () => {
        const scores = completeScores.map((entry) => ({
            ...entry,
            score: 49
        }));

        expect(calculateReadiness(scores)).toEqual({
            score: 49,
            status: "NEEDS_PREPARATION"
        });
    });

    it("accepts zero as a valid score", () => {
        const scores: CompetencyScore[] = [
            {key: "frontend", score: 0, weight: 0.30},
            {key: "backend", score: 0, weight: 0.30},
            {key: "databases", score: 0, weight: 0.25},
            {key: "problem_solving", score: 0, weight: 0.15}
        ];

        expect(calculateReadiness(scores)).toEqual({
            score: 0,
            status: "NEEDS_PREPARATION"
        });
    });
});