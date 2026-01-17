import React, { useState } from "react";
import "./_loginForm.css";
import { login } from "../authService";
import type { User } from "../types";

interface LoginFormProps {
    onLoginSuccess: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("admin@system.local");
    const [password, setPassword] = useState("admin123");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const user = await login(email, password);
            onLoginSuccess(user);
        } catch (err) {
            console.error(err);
            setError("Nieprawidłowy email lub hasło.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-blob login-blob--1" />
            <div className="login-blob login-blob--2" />

            <div className="login-card">
                <div className="login-logo">📄</div>

                <h1 className="login-title">System księgowania dokumentów</h1>
                <p className="login-subtitle">
                    Zaloguj się, aby zarządzać firmami, kontrahentami i dokumentami.
                </p>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="login-label">
                        Email
                        <input
                            type="email"
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@system.local"
                            required
                            autoComplete="email"
                        />
                    </label>

                    <label className="login-label">
                        Hasło
                        <input
                            type="password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </label>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Logowanie..." : "Zaloguj się"}
                    </button>
                </form>

                <p className="login-footer">
                    © {new Date().getFullYear()} System księgowania dokumentów
                </p>
            </div>
        </div>
    );
};

export default LoginForm;
