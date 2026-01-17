import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserEditModal } from "./UserEditModal";

import type { Company, CompanyUpdateRequest, CompanyUserRow, User, Role } from "../types";

import { getCompany, listCompanyUsers, updateCompany } from "../companyService";
import {
    createAdminUser,
    deleteAdminUser,
    patchAdminUser,
    updateAdminUserFull,
} from "../userService";

import { CompanyModal } from "./CompanyModal";
import { UserModal } from "./UserModal";
import { ConfirmDialog } from "./ConfirmDialog";

import "./_companyDetails.css";

interface Props {
    user: User;
    onLogout: () => void;
}

type EditUserPayload = {
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    password: string | null;
};

const CompanyDetails: React.FC<Props> = ({ user, onLogout }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const companyId = Number(id);

    const [company, setCompany] = useState<Company | null>(null);
    const [users, setUsers] = useState<CompanyUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [createUserOpen, setCreateUserOpen] = useState(false);
    const [deleteTargetUser, setDeleteTargetUser] = useState<CompanyUserRow | null>(null);

    const [editOpen, setEditOpen] = useState(false);

    const [editMeOpen, setEditMeOpen] = useState(false);

    const [editUserOpen, setEditUserOpen] = useState(false);
    const [editTargetUser, setEditTargetUser] = useState<CompanyUserRow | null>(null);

    const [busyUserId, setBusyUserId] = useState<number | null>(null);

    const isSystemAdmin = user.role === "ROLE_SYSTEM_ADMIN";
    const canLoad = useMemo(() => Number.isFinite(companyId) && companyId > 0, [companyId]);

    const load = async () => {
        if (!canLoad) {
            setError("Niepoprawny identyfikator firmy.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [c, u] = await Promise.all([getCompany(companyId), listCompanyUsers(companyId)]);
            setCompany(c);
            setUsers(u);
        } catch (e) {
            console.error(e);
            setError("Nie udało się pobrać danych firmy.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const handleEdit = async (payload: CompanyUpdateRequest) => {
        if (!company) return;

        setError(null);
        try {
            await updateCompany(company.id, payload);
            setEditOpen(false);
            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się zapisać zmian firmy.");
        }
    };

    const handleCreateUser = async (payload: any) => {
        setError(null);
        try {
            await createAdminUser(payload);
            setCreateUserOpen(false);
            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się utworzyć użytkownika.");
        }
    };

    const handleChangeUserRole = async (userId: number, role: Role | string) => {
        setError(null);
        setBusyUserId(userId);

        try {
            await patchAdminUser(userId, { role });
            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się zmienić roli użytkownika.");
        } finally {
            setBusyUserId(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteTargetUser) return;

        setError(null);
        setBusyUserId(deleteTargetUser.id);

        try {
            await deleteAdminUser(deleteTargetUser.id);
            setDeleteTargetUser(null);
            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się usunąć użytkownika.");
        } finally {
            setBusyUserId(null);
        }
    };

    const handleEditMeSubmit = async (p: EditUserPayload) => {
        await updateAdminUserFull(user.id, {
            email: p.email,
            role: String(user.role) === "ROLE_SYSTEM_ADMIN" ? p.role : undefined,
            firstName: p.firstName,
            lastName: p.lastName,
            password: p.password ?? undefined,
        });

        await load();
    };

    const handleEditAnyUserSubmit = async (userId: number, p: EditUserPayload) => {
        setError(null);
        setBusyUserId(userId);

        try {
            await updateAdminUserFull(userId, {
                email: p.email,
                role: p.role,
                firstName: p.firstName,
                lastName: p.lastName,
                password: p.password ?? undefined,
            });

            setEditUserOpen(false);
            setEditTargetUser(null);

            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się zapisać zmian użytkownika.");
        } finally {
            setBusyUserId(null);
        }
    };

    if (!isSystemAdmin) {
        return (
            <div style={{ padding: 24 }}>
                <h2>Brak uprawnień</h2>
                <p>Ten widok jest dostępny tylko dla administratora systemu.</p>
                <button onClick={() => navigate("/")}>Wróć</button>
            </div>
        );
    }

    const avatarLetter =
        typeof user?.email === "string" && user.email.length > 0 ? user.email.charAt(0).toUpperCase() : "?";

    return (
        <div className="cd-page">
            <div className="cd-shell">
                <header className="cd-header">
                    <div className="cd-left">
                        <button className="cd-back" onClick={() => navigate("/")}>
                            ← Wróć
                        </button>
                        <div>
                            <div className="cd-title">Szczegóły firmy</div>
                            <div className="cd-subtitle">Zarządzanie firmą i użytkownikami</div>
                        </div>
                    </div>

                    <div className="cd-right">
                        <button
                            type="button"
                            className="cd-user"
                            onClick={() => setEditMeOpen(true)}
                            title="Edytuj swoje dane"
                        >
                            <div className="cd-avatar">{avatarLetter}</div>
                            <div className="cd-userinfo">
                                <div className="cd-email">{user.email}</div>
                                <div className="cd-role">{String(user.role).replace("ROLE_", "")}</div>
                            </div>
                        </button>

                        <button type="button" className="cd-logout" onClick={onLogout}>
                            Wyloguj
                        </button>
                    </div>
                </header>

                {loading && <div className="cd-card">Ładowanie…</div>}
                {error && <div className="cd-card cd-card--error">{error}</div>}

                {!loading && !error && company && (
                    <>
                        <div className="cd-grid">
                            <div className="cd-card">
                                <div className="cd-cardhead">
                                    <h2>{company.name}</h2>
                                    <button className="cd-btn" onClick={() => setEditOpen(true)}>
                                        Edytuj dane
                                    </button>
                                </div>

                                <div className="cd-kv">
                                    <div className="cd-kvrow">
                                        <span>NIP</span>
                                        <strong>{company.taxId ?? "—"}</strong>
                                    </div>
                                    <div className="cd-kvrow">
                                        <span>Adres</span>
                                        <strong>{company.address ?? "—"}</strong>
                                    </div>
                                    <div className="cd-kvrow">
                                        <span>Status</span>
                                        <strong>{company.active ? "aktywna" : "nieaktywna"}</strong>
                                    </div>
                                    <div className="cd-kvrow">
                                        <span>Status VAT</span>
                                        <strong>{company.vatActive ? "czynna" : "nieczynna"}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="cd-card">
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    <h3 style={{ margin: 0 }}>Użytkownicy firmy</h3>
                                    <button className="cd-btn" onClick={() => setCreateUserOpen(true)}>
                                        + Dodaj użytkownika
                                    </button>
                                </div>

                                <div className="cd-tablewrap">
                                    <table className="cd-table">
                                        <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Email</th>
                                            <th>Imię</th>
                                            <th>Nazwisko</th>
                                            <th>Rola</th>
                                            <th>Akcje</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="cd-empty">
                                                    Brak użytkowników przypisanych do tej firmy.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((u) => (
                                                <tr key={u.id}>
                                                    <td>{u.id}</td>
                                                    <td>{u.email}</td>
                                                    <td>{u.firstName ?? "—"}</td>
                                                    <td>{u.lastName ?? "—"}</td>

                                                    <td>
                                                        <select
                                                            className="cd-select"
                                                            value={u.role}
                                                            disabled={busyUserId === u.id}
                                                            onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                                                        >
                                                            <option value="ROLE_EMPLOYEE">Pracownik</option>
                                                            <option value="ROLE_MANAGER">Kierownik</option>
                                                            <option value="ROLE_COMPANY_ADMIN">Admin firmy</option>
                                                            <option value="ROLE_SYSTEM_ADMIN">Admin systemu</option>
                                                        </select>
                                                    </td>

                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <button
                                                            type="button"
                                                            className="cd-btn cd-btn--edit"
                                                            disabled={busyUserId === u.id}
                                                            onClick={() => {
                                                                setEditTargetUser(u);
                                                                setEditUserOpen(true);
                                                            }}
                                                        >
                                                            Edytuj
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="cd-btn cd-btn--danger"
                                                            disabled={busyUserId === u.id}
                                                            onClick={() => setDeleteTargetUser(u)}
                                                            style={{ marginLeft: 8 }}
                                                        >
                                                            Usuń
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {editOpen && (
                            <CompanyModal
                                mode="edit"
                                company={company}
                                onClose={() => setEditOpen(false)}
                                onSubmit={handleEdit}
                            />
                        )}

                        {createUserOpen && (
                            <UserModal
                                companyId={company.id}
                                onClose={() => setCreateUserOpen(false)}
                                onSubmit={handleCreateUser}
                            />
                        )}

                        {deleteTargetUser && (
                            <ConfirmDialog
                                title="Usunąć użytkownika?"
                                description={`Ta operacja jest nieodwracalna. Użytkownik: ${deleteTargetUser.email}`}
                                confirmText="Usuń"
                                danger
                                onCancel={() => setDeleteTargetUser(null)}
                                onConfirm={handleDeleteUser}
                            />
                        )}
                    </>
                )}

                {editMeOpen && (
                    <UserEditModal
                        title="Edytuj swoje dane"
                        initial={{
                            email: user.email ?? "",
                            role: (user as any).role ?? "ROLE_SYSTEM_ADMIN",
                            firstName: (user as any).firstName ?? (user as any).first_name ?? null,
                            lastName: (user as any).lastName ?? (user as any).last_name ?? null,
                        }}
                        canEditRole={String(user.role) === "ROLE_SYSTEM_ADMIN"}
                        onClose={() => setEditMeOpen(false)}
                        onSubmit={async (p) => {
                            await handleEditMeSubmit(p);
                            setEditMeOpen(false);
                        }}
                    />
                )}

                {editUserOpen && editTargetUser && (
                    <UserEditModal
                        title={`Edytuj użytkownika: ${editTargetUser.email}`}
                        initial={{
                            email: editTargetUser.email ?? "",
                            role: editTargetUser.role ?? "ROLE_EMPLOYEE",
                            firstName: editTargetUser.firstName ?? null,
                            lastName: editTargetUser.lastName ?? null,
                        }}
                        canEditRole={true}
                        onClose={() => {
                            setEditUserOpen(false);
                            setEditTargetUser(null);
                        }}
                        onSubmit={async (p) => {
                            await handleEditAnyUserSubmit(editTargetUser.id, p);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default CompanyDetails;