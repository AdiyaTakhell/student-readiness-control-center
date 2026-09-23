import { MongoClient } from "mongodb";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const TEST_DATABASE_URL =
    "postgresql://app:app@localhost:5432/readiness_test";

const MONGO_URL =
    "mongodb://app:app@localhost:27017/?authSource=admin";

const MONGO_DATABASE = "readiness_test";

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: TEST_DATABASE_URL
    })
});

const mongoClient = new MongoClient(MONGO_URL);

await prisma.$connect();
await mongoClient.connect();

const mongo = mongoClient.db(MONGO_DATABASE);

const app = buildApp({
    prisma,
    mongo
});

describe("student API authentication and tenant isolation", () => {
    afterAll(async () => {
        await app.close();
        await mongoClient.close();
        await prisma.$disconnect();
    });

    it("rejects unauthenticated requests", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/students"
        });

        expect(response.statusCode).toBe(401);

        expect(response.json()).toEqual({
            error: {
                code: "UNAUTHENTICATED",
                message: "Authentication required",
                requestId: expect.any(String)
            }
        });
    });

    it("allows an authenticated user to access students in their tenant", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "EVALUATOR"
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/students",
            headers: {
                authorization: `Bearer ${token}`
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "00000000-0000-0000-0000-000000000101"
                }),
                expect.objectContaining({
                    id: "00000000-0000-0000-0000-000000000102"
                })
            ])
        );

        expect(body.data).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "00000000-0000-0000-0000-000000000201"
                })
            ])
        );

        expect(body.pagination).toEqual({
            page: 1,
            pageSize: 20,
            totalItems: 2,
            totalPages: 1
        });
    });

    it("does not reveal a student from another tenant", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "EVALUATOR"
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/students/00000000-0000-0000-0000-000000000201",
            headers: {
                authorization: `Bearer ${token}`
            }
        });

        expect(response.statusCode).toBe(404);

        expect(response.json()).toEqual({
            error: {
                code: "STUDENT_NOT_FOUND",
                message: "Student not found",
                requestId: expect.any(String)
            }
        });
    });

    it("rejects an update using a stale student version", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000011",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "ADMIN"
        });

        const studentId =
            "00000000-0000-0000-0000-000000000101";

        const studentBeforeUpdate =
            await prisma.student.findUniqueOrThrow({
                where: {
                    id: studentId
                },
                select: {
                    displayName: true,
                    version: true
                }
            });

        try {
            const firstResponse = await app.inject({
                method: "PATCH",
                url: `/api/students/${studentId}`,
                headers: {
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json"
                },
                payload: {
                    displayName: "Alice Updated",
                    expectedVersion:
                    studentBeforeUpdate.version
                }
            });

            expect(firstResponse.statusCode).toBe(200);

            const firstBody = firstResponse.json();

            expect(firstBody.version).toBe(
                studentBeforeUpdate.version + 1
            );

            const staleResponse = await app.inject({
                method: "PATCH",
                url: `/api/students/${studentId}`,
                headers: {
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json"
                },
                payload: {
                    displayName: "Alice Stale Update",
                    expectedVersion:
                    studentBeforeUpdate.version
                }
            });

            expect(staleResponse.statusCode).toBe(409);
        } finally {
            await prisma.student.update({
                where: {
                    id: studentId
                },
                data: {
                    displayName:
                    studentBeforeUpdate.displayName,
                    version:
                    studentBeforeUpdate.version
                }
            });
        }
    });

    it("rejects an evaluator from updating student data", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "EVALUATOR"
        });

        const response = await app.inject({
            method: "PATCH",
            url: "/api/students/00000000-0000-0000-0000-000000000101",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json"
            },
            payload: {
                displayName: "Should Not Be Allowed",
                expectedVersion: 1
            }
        });

        expect(response.statusCode).toBe(403);

        expect(response.json()).toEqual({
            error: {
                code: "FORBIDDEN",
                message: "Insufficient permissions",
                requestId: expect.any(String)
            }
        });
    });
    it("rejects unauthenticated attempt creation", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/students/00000000-0000-0000-0000-000000000101/attempts",
            headers: {
                "content-type": "application/json",
                "idempotency-key": `unauthenticated-${Date.now()}`
            },
            payload: {
                competencyKey: "backend",
                score: 85
            }
        });

        expect(response.statusCode).toBe(401);

        expect(response.json()).toEqual({
            error: {
                code: "UNAUTHENTICATED",
                message: "Authentication required",
                requestId: expect.any(String)
            }
        });
    });

    it("allows an evaluator to create an attempt", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "EVALUATOR"
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/students/00000000-0000-0000-0000-000000000101/attempts",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
                "idempotency-key": `api-attempt-${Date.now()}`
            },
            payload: {
                competencyKey: "backend",
                score: 85
            }
        });

        expect(response.statusCode).toBe(201);

        const body = response.json();

        expect(body).toEqual(
            expect.objectContaining({
                attempt: expect.objectContaining({
                    competencyKey: "backend",
                    score: 85
                }),
                readiness: expect.objectContaining({
                    score: expect.any(Number),
                    status: expect.any(String)
                })
            })
        );
    });

    it("rejects a viewer from creating an attempt", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "VIEWER"
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/students/00000000-0000-0000-0000-000000000101/attempts",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
                "idempotency-key": `viewer-attempt-${Date.now()}`
            },
            payload: {
                competencyKey: "backend",
                score: 85
            }
        });

        expect(response.statusCode).toBe(403);

        expect(response.json()).toEqual({
            error: {
                code: "FORBIDDEN",
                message: "Insufficient permissions",
                requestId: expect.any(String)
            }
        });
    });

    it("rejects an attempt with an invalid score", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "EVALUATOR"
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/students/00000000-0000-0000-0000-000000000101/attempts",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
                "idempotency-key": `invalid-score-${Date.now()}`
            },
            payload: {
                competencyKey: "backend",
                score: 101
            }
        });

        expect(response.statusCode).toBe(400);
    });

    it("does not reveal a cross-tenant student during attempt creation", async () => {
        const token = app.jwt.sign({
            sub: "00000000-0000-0000-0000-000000000012",
            tenantId: "00000000-0000-0000-0000-000000000001",
            role: "EVALUATOR"
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/students/00000000-0000-0000-0000-000000000201/attempts",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
                "idempotency-key": `cross-tenant-${Date.now()}`
            },
            payload: {
                competencyKey: "backend",
                score: 85
            }
        });

        expect(response.statusCode).toBe(404);

        expect(response.json()).toEqual({
            error: {
                code: "STUDENT_NOT_FOUND",
                message: "Student not found",
                requestId: expect.any(String)
            }
        });
    });
});