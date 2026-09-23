import {describe, expect, it} from "vitest";
import {
    selectLatestValidAttempt,
    type AttemptForSelection
} from "./latest-attempt.js";

describe("selectLatestValidAttempt", () => {
    it("returns null when there are no attempts", () => {
        expect(selectLatestValidAttempt([])).toBeNull();
    });

    it("returns null when all attempts are voided", () => {
        const attempts: AttemptForSelection[] = [
            {
                id: "101",
                submittedAt: new Date("2026-09-23T10:00:00Z"),
                score: 80,
                voided: true
            },
            {
                id: "102",
                submittedAt: new Date("2026-09-23T11:00:00Z"),
                score: 90,
                voided: true
            }
        ];

        expect(selectLatestValidAttempt(attempts)).toBeNull();
    });

    it("selects the latest non-voided attempt", () => {
        const attempts: AttemptForSelection[] = [
            {
                id: "101",
                submittedAt: new Date("2026-09-23T10:00:00Z"),
                score: 60,
                voided: false
            },
            {
                id: "102",
                submittedAt: new Date("2026-09-23T11:00:00Z"),
                score: 80,
                voided: false
            },
            {
                id: "103",
                submittedAt: new Date("2026-09-23T12:00:00Z"),
                score: 20,
                voided: true
            }
        ];

        expect(selectLatestValidAttempt(attempts)?.id).toBe("102");
    });

    it("ignores a newer voided attempt", () => {
        const attempts: AttemptForSelection[] = [
            {
                id: "101",
                submittedAt: new Date("2026-09-23T10:00:00Z"),
                score: 70,
                voided: false
            },
            {
                id: "102",
                submittedAt: new Date("2026-09-23T12:00:00Z"),
                score: 20,
                voided: true
            }
        ];

        expect(selectLatestValidAttempt(attempts)?.id).toBe("101");
    });

    it("uses attempt id as the tie-breaker when timestamps are equal", () => {
        const submittedAt = new Date("2026-09-23T10:00:00Z");

        const attempts: AttemptForSelection[] = [
            {
                id: "100",
                submittedAt,
                score: 70,
                voided: false
            },
            {
                id: "101",
                submittedAt,
                score: 90,
                voided: false
            }
        ];

        expect(selectLatestValidAttempt(attempts)?.id).toBe("101");
    });

    it("does not let a voided attempt participate in tie-breaking", () => {
        const submittedAt = new Date("2026-09-23T10:00:00Z");

        const attempts: AttemptForSelection[] = [
            {
                id: "100",
                submittedAt,
                score: 70,
                voided: false
            },
            {
                id: "999",
                submittedAt,
                score: 20,
                voided: true
            }
        ];

        expect(selectLatestValidAttempt(attempts)?.id).toBe("100");
    });
});