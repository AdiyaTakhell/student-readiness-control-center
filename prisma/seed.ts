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
        weight: 0.3,
        required: true
    },
    {
        key: "backend",
        displayName: "Backend",
        weight: 0.3,
        required: true
    },
    {
        key: "databases",
        displayName: "Databases",
        weight: 0.25,
        required: true
    },
    {
        key: "problem_solving",
        displayName: "Problem Solving",
        weight: 0.15,
        required: true
    }
];

async function main() {
    for (const competency of competencies) {
        await prisma.competency.upsert({
            where: {
                key: competency.key
            },
            update: {
                displayName: competency.displayName,
                weight: competency.weight,
                required: competency.required
            },
            create: competency
        });
    }

    const tenantA = await prisma.tenant.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000001"
        },
        update: {
            name: "Acme Academy",
            status: "ACTIVE"
        },
        create: {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Acme Academy",
            status: "ACTIVE"
        }
    });

    const tenantB = await prisma.tenant.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000002"
        },
        update: {
            name: "Beta Academy",
            status: "ACTIVE"
        },
        create: {
            id: "00000000-0000-0000-0000-000000000002",
            name: "Beta Academy",
            status: "ACTIVE"
        }
    });

    const developmentPasswordHash = "development-only-not-a-real-password-hash";

    const adminA = await prisma.user.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000011"
        },
        update: {
            tenantId: tenantA.id,
            email: "admin@acme.test",
            displayName: "Acme Admin",
            role: "ADMIN",
            passwordHash: developmentPasswordHash
        },
        create: {
            id: "00000000-0000-0000-0000-000000000011",
            tenantId: tenantA.id,
            email: "admin@acme.test",
            displayName: "Acme Admin",
            role: "ADMIN",
            passwordHash: developmentPasswordHash
        }
    });

    const evaluatorA = await prisma.user.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000012"
        },
        update: {
            tenantId: tenantA.id,
            email: "evaluator@acme.test",
            displayName: "Acme Evaluator",
            role: "EVALUATOR",
            passwordHash: developmentPasswordHash
        },
        create: {
            id: "00000000-0000-0000-0000-000000000012",
            tenantId: tenantA.id,
            email: "evaluator@acme.test",
            displayName: "Acme Evaluator",
            role: "EVALUATOR",
            passwordHash: developmentPasswordHash
        }
    });

    const adminB = await prisma.user.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000021"
        },
        update: {
            tenantId: tenantB.id,
            email: "admin@beta.test",
            displayName: "Beta Admin",
            role: "ADMIN",
            passwordHash: developmentPasswordHash
        },
        create: {
            id: "00000000-0000-0000-0000-000000000021",
            tenantId: tenantB.id,
            email: "admin@beta.test",
            displayName: "Beta Admin",
            role: "ADMIN",
            passwordHash: developmentPasswordHash
        }
    });

    const evaluatorB = await prisma.user.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000022"
        },
        update: {
            tenantId: tenantB.id,
            email: "evaluator@beta.test",
            displayName: "Beta Evaluator",
            role: "EVALUATOR",
            passwordHash: developmentPasswordHash
        },
        create: {
            id: "00000000-0000-0000-0000-000000000022",
            tenantId: tenantB.id,
            email: "evaluator@beta.test",
            displayName: "Beta Evaluator",
            role: "EVALUATOR",
            passwordHash: developmentPasswordHash
        }
    });

    const alice = await prisma.student.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000101"
        },
        update: {
            tenantId: tenantA.id,
            email: "alice@acme.test",
            displayName: "Alice"
        },
        create: {
            id: "00000000-0000-0000-0000-000000000101",
            tenantId: tenantA.id,
            email: "alice@acme.test",
            displayName: "Alice"
        }
    });

    const bob = await prisma.student.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000102"
        },
        update: {
            tenantId: tenantA.id,
            email: "bob@acme.test",
            displayName: "Bob"
        },
        create: {
            id: "00000000-0000-0000-0000-000000000102",
            tenantId: tenantA.id,
            email: "bob@acme.test",
            displayName: "Bob"
        }
    });

    const charlie = await prisma.student.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000201"
        },
        update: {
            tenantId: tenantB.id,
            email: "charlie@beta.test",
            displayName: "Charlie"
        },
        create: {
            id: "00000000-0000-0000-0000-000000000201",
            tenantId: tenantB.id,
            email: "charlie@beta.test",
            displayName: "Charlie"
        }
    });

    await prisma.attempt.deleteMany({
        where: {
            id: {
                in: [
                    "00000000-0000-0000-0000-000000001001",
                    "00000000-0000-0000-0000-000000001002",
                    "00000000-0000-0000-0000-000000001003",
                    "00000000-0000-0000-0000-000000001004",
                    "00000000-0000-0000-0000-000000001005",
                    "00000000-0000-0000-0000-000000001006",
                    "00000000-0000-0000-0000-000000001007"
                ]
            }
        }
    });

    await prisma.attempt.createMany({
        data: [
            {
                id: "00000000-0000-0000-0000-000000001001",
                tenantId: tenantA.id,
                studentId: alice.id,
                competencyKey: "frontend",
                evaluatorId: evaluatorA.id,
                score: 80,
                submittedAt: new Date("2026-09-20T10:00:00Z")
            },
            {
                id: "00000000-0000-0000-0000-000000001002",
                tenantId: tenantA.id,
                studentId: alice.id,
                competencyKey: "backend",
                evaluatorId: evaluatorA.id,
                score: 80,
                submittedAt: new Date("2026-09-20T10:01:00Z")
            },
            {
                id: "00000000-0000-0000-0000-000000001003",
                tenantId: tenantA.id,
                studentId: alice.id,
                competencyKey: "databases",
                evaluatorId: evaluatorA.id,
                score: 80,
                submittedAt: new Date("2026-09-20T10:02:00Z")
            },
            {
                id: "00000000-0000-0000-0000-000000001004",
                tenantId: tenantA.id,
                studentId: alice.id,
                competencyKey: "problem_solving",
                evaluatorId: evaluatorA.id,
                score: 80,
                submittedAt: new Date("2026-09-20T10:03:00Z")
            },
            {
                id: "00000000-0000-0000-0000-000000001005",
                tenantId: tenantA.id,
                studentId: bob.id,
                competencyKey: "frontend",
                evaluatorId: evaluatorA.id,
                score: 90,
                submittedAt: new Date("2026-09-20T11:00:00Z")
            },
            {
                id: "00000000-0000-0000-0000-000000001006",
                tenantId: tenantA.id,
                studentId: bob.id,
                competencyKey: "backend",
                evaluatorId: evaluatorA.id,
                score: 80,
                submittedAt: new Date("2026-09-20T11:01:00Z")
            },
            {
                id: "00000000-0000-0000-0000-000000001007",
                tenantId: tenantB.id,
                studentId: charlie.id,
                competencyKey: "frontend",
                evaluatorId: evaluatorB.id,
                score: 100,
                submittedAt: new Date("2026-09-20T12:00:00Z")
            }
        ]
    });

    await prisma.student.update({
        where: {
            id: alice.id
        },
        data: {
            currentScore: 80,
            readiness: "READY"
        }
    });

    await prisma.student.update({
        where: {
            id: bob.id
        },
        data: {
            currentScore: null,
            readiness: "INCOMPLETE"
        }
    });

    await prisma.student.update({
        where: {
            id: charlie.id
        },
        data: {
            currentScore: 100,
            readiness: "READY"
        }
    });

    console.log("Seed completed successfully.", {
        tenants: 2,
        users: 4,
        students: 3,
        attempts: 7,
        competencies: competencies.length,
        seededBy: [adminA.email, evaluatorA.email, adminB.email, evaluatorB.email]
    });
}

try {
    await main();
} finally {
    await prisma.$disconnect();
}