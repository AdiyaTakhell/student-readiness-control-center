import type {FastifyReply, FastifyRequest} from "fastify";

type UserRole = "ADMIN" | "EVALUATOR" | "VIEWER";

export function authorize(...allowedRoles: UserRole[]) {
    return async (
        request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        if (!allowedRoles.includes(request.user.role)) {
            return reply.code(403).send({
                error: {
                    code: "FORBIDDEN",
                    message: "Insufficient permissions",
                    requestId: request.id,
                },
            });
        }
    };
}