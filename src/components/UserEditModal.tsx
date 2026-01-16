import React, { useMemo, useState } from "react";
import "./_modal.css";

type SubmitPayload = {
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    password: string | null;
};

type InitialShape = {
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
};

type BaseProps = {
    title: string;
    canEditRole?: boolean;
    onClose: () => void;
    onSaved?: () => void;
    onSubmit: (payload: SubmitPayload) => Promise<void>;
};

type PropsWithUser = BaseProps & { user: InitialShape; initial?: never };
type PropsWithInitial = BaseProps & { initial: InitialShape; user?: never };
type Props = PropsWithUser | PropsWithInitial;

function hasUser(p: Props): p is PropsWithUser {
    return (p as PropsWithUser).user !== undefined;
}

function validatePassword(pwd: string): string | null {
    if (pwd.length < 8) return "Hasło musi mieć minimum 8 znaków.";
    if (!/[a-z]/.test(pwd)) return "Hasło musi zawierać minimum jedną małą literę.";
    if (!/[A-Z]/.test(pwd)) return "Hasło musi zawierać minimum jedną wielką literę.";
    if (!/\d/.test(pwd)) return "Hasło musi zawierać minimum jedną cyfrę.";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Hasło musi zawierać minimum jeden znak specjalny.";
    return null;
}

export const UserEditModal: React.FC<Props> = (props) => {
    const canEditRole = props.canEditRole ?? true;

    const initial: InitialShape = useMemo(() => {
        if (hasUser(props)) {
            return {
                email: props.user.email,
                role: props.user.role ?? "ROLE_EMPLOYEE",
                firstName: props.user.firstName ?? null,
                lastName: props.user.lastName ?? null,
            };
        }
        return {
            email: props.initial.email,
            role: props.initial.role ?? "ROLE_EMPLOYEE",
            firstName: props.initial.firstName ?? null,
            lastName: props.initial.lastName ?? null,
        };
    }, [props]);

    const [email, setEmail] = useState(initial.email);
    const [role, setRole] = useState(initial.role ?? "ROLE_EMPLOYEE");
    const [firstName, setFirstName] = useState(initial.firstName ?? "");
    const [lastName, setLastName] = useState(initial.lastName ?? "");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const trimmedPwd = password.trim();

        if (trimmedPwd) {
            const err = validatePassword(trimmedPwd);
            if (err) {
                setLoading(false);
                setError(err);
                return;
            }
        }

        try {
            await props.onSubmit({
                email: email.trim(),
                role,
                firstName: firstName.trim() ? firstName.trim() : null,
                lastName: lastName.trim() ? lastName.trim() : null,
                password: trimmedPwd ? trimmedPwd : null,
            });

            props.onSaved?.();
            props.onClose();
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? "Nie udało się zapisać zmian.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="m-overlay" onMouseDown={props.onClose}>
            <div className="m-card" onMouseDown={(e) => e.stopPropagation()}>
                <div className="m-head">
                    <h2>{props.title}</h2>
                    <button className="m-x" onClick={props.onClose} type="button">×</button>
                </div>

                {error && <div className="m-error m-error--scroll">{error}</div>}

                <form className="m-form" onSubmit={submit}>
                    <label>
                        Email
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
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
                        Hasło (opcjonalnie)
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            placeholder="Zostaw puste aby nie zmieniać"
                        />
                    </label>

                    <label>
                        Rola
                        <select value={role} onChange={(e) => setRole(e.target.value)} disabled={!canEditRole}>
                            <option value="ROLE_EMPLOYEE">Pracownik</option>
                            <option value="ROLE_MANAGER">Kierownik</option>
                            <option value="ROLE_SYSTEM_ADMIN">Admin systemu</option>
                        </select>
                    </label>

                    <div className="m-actions">
                        <button type="button" className="m-btn m-btn--ghost" onClick={props.onClose} disabled={loading}>
                            Anuluj
                        </button>
                        <button type="submit" className="m-btn m-btn--primary" disabled={loading}>
                            {loading ? "Zapisywanie..." : "Zapisz"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};