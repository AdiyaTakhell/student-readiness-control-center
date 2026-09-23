import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    clearAccessToken,
    getAccessToken,
    setAccessToken,
} from "./auth.storage";
import {
    login,
} from "../api/client";

interface AuthContextValue {
    token: string | null;
    isAuthenticated: boolean;
    loginUser: (
        tenantSlug: string,
        email: string,
        password: string,
    ) => Promise<void>;
    logout: () => void;
}

const AuthContext =
    createContext<AuthContextValue | null>(
        null,
    );

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({
                                 children,
                             }: AuthProviderProps) {
    const [token, setToken] =
        useState<string | null>(
            getAccessToken(),
        );

    async function loginUser(
        tenantSlug: string,
        email: string,
        password: string,
    ): Promise<void> {
        const response = await login({
            tenantSlug,
            email,
            password,
        });

        setAccessToken(
            response.accessToken,
        );

        setToken(response.accessToken);
    }

    function logout(): void {
        clearAccessToken();
        setToken(null);
    }

    const value = useMemo(
        () => ({
            token,
            isAuthenticated: token !== null,
            loginUser,
            logout,
        }),
        [token],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider",
        );
    }

    return context;
}