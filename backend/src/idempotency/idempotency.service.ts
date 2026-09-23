import { createHash } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";

export function createRequestFingerprint(
    body: unknown
): string {
    const normalizedBody = JSON.stringify(body);

    return createHash("sha256")
        .update(normalizedBody)
        .digest("hex");
}

export async function findIdempotencyRecord(
    prisma: PrismaClient,
    tenantId: string,
    key: string
) {
    return prisma.idempotencyRecord.findFirst({
        where: {
            tenantId,
            key,
            expiresAt: {
                gt: new Date()
            }
        }
    });
}