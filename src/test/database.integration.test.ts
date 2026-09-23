import { afterAll, describe, expect, it } from "vitest";
import { createTestPrisma } from "./test-database.js";

const prisma = createTestPrisma();

describe("test database", () => {
    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("connects to the test database", async () => {
        const result = await prisma.$queryRaw<
            Array<{ current_database: string }>
        >`SELECT current_database()`;

        expect(result[0]?.current_database).toBe(
            "readiness_test"
        );
    });
});