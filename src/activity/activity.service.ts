import type { PrismaClient } from "../generated/prisma/client.js";
import type { Db } from "mongodb";
import {
    findStudentActivity,
    type ActivityPage
} from "./activity.repository.js";

interface GetStudentActivityInput {
    tenantId: string;
    studentId: string;
    page: number;
    pageSize: number;
}

export async function getStudentActivity(
    prisma: PrismaClient,
    mongo: Db,
    input: GetStudentActivityInput
): Promise<ActivityPage> {
    const student = await prisma.student.findFirst({
        where: {
            id: input.studentId,
            tenantId: input.tenantId
        },
        select: {
            id: true
        }
    });

    if (!student) {
        throw new Error("STUDENT_NOT_FOUND");
    }

    return findStudentActivity(
        mongo,
        input.tenantId,
        input.studentId,
        input.page,
        input.pageSize
    );
}