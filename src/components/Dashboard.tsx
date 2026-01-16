import React, { useMemo, useState, useEffect } from "react";
import type { User } from "../types";
import "./_dashboard.css";
import { CompanyList } from "./CompanyList";
import { DocumentList } from "./DocumentList";
import { LedgerList } from "./LedgerList";
import { CategoryList } from "./CategoryList";
import { ContractorList } from "./ContractorList";
import { UserEditModal } from "./UserEditModal";
import { updateMe } from "../userService";

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

type ViewMode = "documents" | "ledger" | "categories" | "contractors" | "companies";

type RoleLike = string | { code?: string; name?: string } | null | undefined;

const roleToCode = (role: RoleLike): string | null => {
    if (!role) return null;
    if (typeof role === "string") return role;
    if (typeof role === "object" && typeof role.code === "string") return role.code;
    return null;
};

const roleToLabel = (role: RoleLike): string => {
    if (!role) return "";
    if (typeof role === "string") return role.replace(/^ROLE_/, "");
    if (typeof role === "object") {
        if (typeof role.name === "string" && role.name.trim() !== "") return role.name;
        if (typeof role.code === "string") return role.code.replace(/^ROLE_/, "");
    }
    return "";
};

const normalizeRoleCodes = (user: User): string[] => {
    const codes = new Set<string>();

    const main = roleToCode((user as any).role);
    if (main) codes.add(main);

    const list: any[] = Array.isArray((user as any).roles) ? (user as any).roles : [];
    for (const r of list) {
        const c = roleToCode(r);
        if (c) codes.add(c);
    }

    return Array.from(codes);
};

const Dashboard: React.FC<DashboardProps> = ({ user: userProp, onLogout }) => {
    const [user, setUser] = useState<User>(userProp);
    useEffect(() => setUser(userProp), [userProp]);

    const [editOpen, setEditOpen] = useState(false);

    const roleCodes = useMemo(() => normalizeRoleCodes(user), [user]);

    const isSystemAdmin = useMemo(() => {
        return roleCodes.includes("ROLE_SYSTEM_ADMIN") || roleCodes.includes("SYSTEM_ADMIN");
    }, [roleCodes]);

    const isManager = useMemo(() => roleCodes.includes("ROLE_MANAGER"), [roleCodes]);

    const [view, setView] = useState<ViewMode>(isSystemAdmin ? "companies" : "documents");

    useEffect(() => {
        setView(isSystemAdmin ? "companies" : "documents");
    }, [isSystemAdmin]);

    const Tabs = () => {
        if (isSystemAdmin) {
            return (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <button
                        type="button"
                        className="doc-btn doc-btn--primary"
                        onClick={() => setView("companies")}
                        style={{ opacity: view === "companies" ? 1 : 0.6 }}
                    >
                        Firmy
                    </button>

                    <button
                        type="button"
                        className="doc-btn doc-btn--primary"
                        onClick={() => setView("categories")}
                        style={{ opacity: view === "categories" ? 1 : 0.6 }}
                    >
                        Kategorie
                    </button>
                </div>
            );
        }

        return (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <button
                    type="button"
                    className="doc-btn doc-btn--primary"
                    onClick={() => setView("documents")}
                    style={{ opacity: view === "documents" ? 1 : 0.6 }}
                >
                    Dokumenty (bufor)
                </button>

                <button
                    type="button"
                    className="doc-btn doc-btn--primary"
                    onClick={() => setView("ledger")}
                    style={{ opacity: view === "ledger" ? 1 : 0.6 }}
                >
                    Księga (zaksięgowane)
                </button>

                <button
                    type="button"
                    className="doc-btn doc-btn--primary"
                    onClick={() => setView("categories")}
                    style={{ opacity: view === "categories" ? 1 : 0.6 }}
                >
                    Kategorie
                </button>

                <button
                    type="button"
                    className="doc-btn doc-btn--primary"
                    onClick={() => setView("contractors")}
                    style={{ opacity: view === "contractors" ? 1 : 0.6 }}
                >
                    Kontrahenci
                </button>
            </div>
        );
    };

    const avatarLetter =
        typeof user?.email === "string" && user.email.length > 0 ? user.email.charAt(0).toUpperCase() : "?";

    const roleText = roleToLabel((user as any).role) || roleCodes[0]?.replace(/^ROLE_/, "") || "";

    return (
        <div className="dash-page">
            <div className="dash-blob dash-blob--1" />
            <div className="dash-blob dash-blob--2" />

            <div className="dash-shell">
                <header className="dash-header">
                    <div className="dash-logo">
                        <span className="dash-logo-icon">📄</span>
                        <div className="dash-logo-text">
                            <span className="dash-logo-title">DocLedger</span>
                            <span className="dash-logo-subtitle">System księgowania dokumentów</span>
                        </div>
                    </div>

                    <div className="dash-header-right">
                        <button
                            type="button"
                            className="dash-user-chip"
                            onClick={() => setEditOpen(true)}
                            style={{ cursor: "pointer", border: "none", background: "transparent" }}
                            title="Edytuj swoje dane"
                        >
                            <div className="dash-user-avatar">{avatarLetter}</div>
                            <div className="dash-user-info">
                                <span className="dash-user-email">{user?.email ?? ""}</span>
                                <span className="dash-user-role">{roleText}</span>
                            </div>
                        </button>

                        <button type="button" className="dash-logout-btn" onClick={onLogout}>
                            Wyloguj
                        </button>
                    </div>
                </header>

                <main className="dash-main dash-main--single">
                    <section className="dash-main-right">
                        <Tabs />

                        {isSystemAdmin && (
                            <>
                                {view === "companies" && <CompanyList />}
                                {view === "categories" && <CategoryList user={user} canEdit={true} />}
                            </>
                        )}

                        {!isSystemAdmin && (
                            <>
                                {view === "documents" && <DocumentList user={user} />}
                                {view === "ledger" && <LedgerList />}
                                {view === "categories" && <CategoryList user={user} canEdit={isManager} />}
                                {view === "contractors" && <ContractorList user={user} />}
                            </>
                        )}
                    </section>
                </main>
            </div>

            {editOpen && (
                <UserEditModal
                    title="Edytuj moje dane"
                    initial={{
                        email: user.email ?? "",
                        role: (user as any).role ?? "ROLE_EMPLOYEE",
                        firstName: (user as any).firstName ?? (user as any).first_name ?? null,
                        lastName: (user as any).lastName ?? (user as any).last_name ?? null,
                    }}
                    canEditRole={String(user.role) === "ROLE_SYSTEM_ADMIN"}
                    onClose={() => setEditOpen(false)}
                    onSubmit={async (p) => {
                        const updated = await updateMe({
                            email: p.email,
                            role: p.role,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            password: p.password,
                        });

                        setUser(updated);
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;