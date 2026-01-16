import React, { useState } from "react";
import type { AdminUserCreateRequest } from "../types";
import "./_modal.css";

type Props = {
    companyId: number;
    onClose: () => void;
    onSubmit: (payload: AdminUserCreateRequest) => Promise<void>;
};

function validatePassword(pwd: string): string | null {
    if (pwd.length < 8) return "Hasło musi mieć minimum 8 znaków.";
    if (!/[a-z]/.test(pwd)) return "Hasło musi zawierać minimum jedną małą literę.";
    if (!/[A-Z]/.test(pwd)) return "Hasło musi zawierać minimum jedną wielką literę.";
    if (!/\d/.test(pwd)) return "Hasło musi zawierać minimum jedną cyfrę.";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Hasło musi zawierać minimum jeden znak specjalny.";
    return null;
}

export const UserModal: React.FC<Props> = ({ companyId, onClose, onSubmit }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("ROLE_EMPLOYEE");
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const pwd = password.trim();
        const pwdErr = validatePassword(pwd);
        if (pwdErr) {
            setLoading(false);
            setError(pwdErr);
            return;
        }

        try {
            await onSubmit({
                email: email.trim(),
                password: pwd,
                role,
                companyId,
                firstName: firstName.trim() ? firstName.trim() : null,
                lastName: lastName.trim() ? lastName.trim() : null,
            });
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? "Nie udało się utworzyć użytkownika (sprawdź email/hasło lub duplikat).");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="m-overlay" onMouseDown={onClose}>
            <div className="m-card" onMouseDown={(e) => e.stopPropagation()}>
                <div className="m-head">
                    <h2>Dodaj użytkownika</h2>
                    <button className="m-x" onClick={onClose} type="button">×</button>
                </div>

                {error && <div className="m-error">{error}</div>}

                <form className="m-form" onSubmit={submit}>
                    <label>
                        Email
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                    </label>

                    <label>
                        Hasło
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
                    </label>

                    <div className="m-row">
                        <label>
                            Imię
                            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </label>

                        <label>
                            Nazwisko
                            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </label>
                    </div>

                    <label>
                        Rola
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="ROLE_EMPLOYEE">Pracownik</option>
                            <option value="ROLE_MANAGER">Kierownik</option>
                            <option value="ROLE_SYSTEM_ADMIN">Admin systemu</option>
                        </select>
                    </label>

                    <div className="m-actions">
                        <button type="button" className="m-btn m-btn--ghost" onClick={onClose} disabled={loading}>
                            Anuluj
                        </button>
                        <button type="submit" className="m-btn m-btn--primary" disabled={loading}>
                            {loading ? "Zapisywanie..." : "Utwórz"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};