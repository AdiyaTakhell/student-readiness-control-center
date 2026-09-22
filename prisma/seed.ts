import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { env } from "../src/config/env.js";

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: env.DATABASE_URL
    })
});

const competencies = [
    {
        key: "frontend",
        displayName: "Frontend",
        weight: 0.3
    },
    {
        key: "backend",
        displayName: "Backend",
        weight: 0.3
    },
    {
        key: "databases",
        displayName: "Databases",
        weight: 0.25
    },
    {
        key: "problem_solving",
        displayName: "Problem Solving",
        weight: 0.15
    }
];

await prisma.competency.createMany({
    data: competencies,
    skipDuplicates: true
});

await prisma.$disconnect();