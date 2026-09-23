import {
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import { useAuth } from "./auth/AuthContext";

function ProtectedRoute({
                            children,
                        }: {
    children: React.ReactNode;
}) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}

export default function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<LoginPage />}
            />

            <Route
                path="/students"
                element={
                    <ProtectedRoute>
                        <StudentsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/students/:id"
                element={
                    <ProtectedRoute>
                        <StudentDetailPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to="/students"
                        replace
                    />
                }
            />
        </Routes>
    );
}