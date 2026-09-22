import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "../generated/prisma/client.js";

interface LoginInput {
    tenantSlug: string;
    email: string;
    password: string;
}

export async function login(
    app: FastifyInstance,
    prisma: PrismaClient,
    input: LoginInput
): Promise<{ accessToken: string }> {
    const tenant = await prisma.tenant.findUnique({
        where: {
            slug: input.tenantSlug
        }
    });

    if (!tenant || tenant.status !== "ACTIVE") {
        throw new Error("INVALID_CREDENTIALS");
    }

    const user = await prisma.user.findUnique({
        where: {
            tenantId_email: {
                tenantId: tenant.id,
                email: input.email
            }
        }
    });

    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const passwordValid = await argon2.verify(
        user.passwordHash,
        input.password
    );

    if (!passwordValid) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const accessToken = app.jwt.sign({
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role
    });

    return { accessToken };
}