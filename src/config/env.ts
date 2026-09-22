import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.url(),
    MONGODB_URL: z.url(),
    MONGODB_DATABASE: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    CORS_ORIGIN: z.url()
});

export const env = envSchema.parse(process.env);