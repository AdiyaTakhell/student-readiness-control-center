import {
    useState,
    type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiRequestError } from "../api/client";

export default function LoginPage() {
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const [tenantSlug, setTenantSlug] =
        useState("acme");
    const [email, setEmail] =
        useState("evaluator@acme.test");
    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);
        setIsSubmitting(true);

        try {
            await loginUser(
                tenantSlug,
                email,
                password,
            );

            navigate("/students");
        } catch (error) {
            if (
                error instanceof
                ApiRequestError
            ) {
                setError(
                    error.details.error.message,
                );
            } else {
                setError(
                    "Unable to sign in",
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-card">
                <h1>
                    Student Readiness
                    Control Center
                </h1>

                <p>
                    Sign in to continue.
                </p>

                <form
                    onSubmit={handleSubmit}
                >
                    <label>
                        Tenant
                        <input
                            value={tenantSlug}
                            onChange={(event) =>
                                setTenantSlug(
                                    event.target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(
                                    event.target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    {error && (
                        <p
                            role="alert"
                            className="form-error"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            isSubmitting
                        }
                    >
                        {isSubmitting
                            ? "Signing in..."
                            : "Sign in"}
                    </button>
                </form>
            </section>
        </main>
    );
}