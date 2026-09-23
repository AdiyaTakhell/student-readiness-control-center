import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const TEST_DATABASE_URL =
    "postgresql://app:app@localhost:5432/readiness_test";

export function createTestPrisma(): PrismaClient {
    return new PrismaClient({
        adapter: new PrismaPg({
            connectionString: TEST_DATABASE_URL
        })
    });
}