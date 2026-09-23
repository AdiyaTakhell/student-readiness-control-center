import type { PrismaClient } from "../generated/prisma/client.js";

interface UpdateStudentInput {
    tenantId: string;
    studentId: string;
    displayName: string;
    expectedVersion: number;
}

export async function updateStudent(
    prisma: PrismaClient,
    input: UpdateStudentInput
) {
    const result = await prisma.student.updateMany({
        where: {
            id: input.studentId,
            tenantId: input.tenantId,
            version: input.expectedVersion
        },
        data: {
            displayName: input.displayName,
            version: {
                increment: 1
            }
        }
    });

    if (result.count === 0) {
        throw new Error("STUDENT_UPDATE_CONFLICT");
    }

    return prisma.student.findFirstOrThrow({
        where: {
            id: input.studentId,
            tenantId: input.tenantId
        },
        select: {
            id: true,
            displayName: true,
            email: true,
            version: true,
            currentScore: true,
            readiness: true
        }
    });
}