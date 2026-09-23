export interface AttemptForSelection {
    id: string;
    submittedAt: Date;
    score: number;
    voided: boolean;
}

export function selectLatestValidAttempt(
    attempts: AttemptForSelection[]
): AttemptForSelection | null {
    const validAttempts = attempts.filter((attempt) => !attempt.voided);

    if (validAttempts.length === 0) {
        return null;
    }

    return validAttempts.reduce((latest, current) => {
        if (current.submittedAt > latest.submittedAt) {
            return current;
        }

        if (
            current.submittedAt.getTime() === latest.submittedAt.getTime() &&
            current.id > latest.id
        ) {
            return current;
        }

        return latest;
    });
}