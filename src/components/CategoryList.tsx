import React, { useEffect, useMemo, useState } from "react";
import type { CategoryRow, User } from "../types";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../categoryService";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
    user: User;
    canEdit: boolean;
};

type CategoryType = "INCOME" | "COST";
type TypeFilter = "all" | CategoryType;

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
    { value: "all", label: "Wszystkie" },
    { value: "INCOME", label: "Przychód" },
    { value: "COST", label: "Koszt" },
];

type DeleteTarget = { id: number; name: string };

function getApiErrorMessage(err: unknown): string | null {
    const anyErr = err as any;

    const msg1 = anyErr?.response?.data?.message;
    if (typeof msg1 === "string" && msg1.trim()) return msg1;

    const msg2 = anyErr?.data?.message;
    if (typeof msg2 === "string" && msg2.trim()) return msg2;

    const msg3 = anyErr?.message;
    if (typeof msg3 === "string" && msg3.trim()) return msg3;

    return null;
}

function isAdmin(user: User): boolean {
    const role = user.role ?? "";
    const roles = user.roles ?? [];
    return (
        role === "ROLE_SYSTEM_ADMIN" ||
        roles.includes("ROLE_SYSTEM_ADMIN")
    );
}

export const CategoryList: React.FC<Props> = ({ user }) => {
    const canEdit = isAdmin(user);

    const [items, setItems] = useState<CategoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<TypeFilter>("all");
    const [q, setQ] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<CategoryType>("COST");

    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<CategoryType>("COST");

    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listCategories();
            setItems(data);
        } catch (e) {
            console.error(e);
            setError("Nie udało się pobrać kategorii.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        let result = items;

        if (type !== "all") {
            result = result.filter((c) => c.type === type);
        }

        const qq = q.trim().toLowerCase();
        if (qq) {
            result = result.filter((c) => (c.name ?? "").toLowerCase().includes(qq));
        }

        return result;
    }, [items, q, type]);

    const startEdit = (c: CategoryRow) => {
        if (!canEdit) return;
        setEditId(c.id);
        setEditName(c.name ?? "");
        setEditType((c.type === "INCOME" || c.type === "COST" ? c.type : "COST") as CategoryType);
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditName("");
        setEditType("COST");
    };

    const handleCreate = async () => {
        if (!canEdit) return;

        setError(null);
        const name = newName.trim();
        if (!name) {
            setError("Podaj nazwę kategorii.");
            return;
        }

        setSaving(true);
        try {
            await createCategory({ name, type: newType });
            setNewName("");
            setNewType("COST");
            setCreateOpen(false);
            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się dodać kategorii.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async (id: number) => {
        if (!canEdit) return;

        setError(null);
        const name = editName.trim();
        if (!name) {
            setError("Nazwa nie może być pusta.");
            return;
        }

        setSaving(true);
        try {
            await updateCategory(id, { name, type: editType });
            cancelEdit();
            await load();
        } catch (e) {
            console.error(e);
            setError("Nie udało się zapisać zmian.");
        } finally {
            setSaving(false);
        }
    };

    const requestDelete = (c: CategoryRow) => {
        if (!canEdit) return;
        setError(null);
        setDeleteTarget({ id: c.id, name: c.name ?? `ID ${c.id}` });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        if (!canEdit) return;

        setSaving(true);
        setError(null);

        try {
            await deleteCategory(deleteTarget.id);

            if (editId === deleteTarget.id) cancelEdit();
            setDeleteTarget(null);
            await load();
        } catch (e) {
            const msg = getApiErrorMessage(e) ?? "Nie udało się usunąć kategorii.";
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="doc-card">
            <div className="doc-header">
                <div>
                    <h2>Kategorie</h2>
                    <p>
                        Kategorie są przypisane do Twojej firmy.{" "}
                        {canEdit ? "Możesz dodawać/edytować/usuwać (ADMIN)." : "Masz tylko podgląd."}
                    </p>
                </div>

                <div className="doc-toolbar">
                    <input
                        className="doc-input"
                        placeholder="Szukaj…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />

                    <select
                        className="doc-select"
                        value={type}
                        onChange={(e) => setType(e.target.value as TypeFilter)}
                    >
                        {TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    <button className="doc-btn doc-btn--ghost" type="button" onClick={load} disabled={loading}>
                        Odśwież
                    </button>

                    {canEdit && (
                        <button
                            className="doc-btn doc-btn--primary"
                            type="button"
                            onClick={() => setCreateOpen((v) => !v)}
                        >
                            {createOpen ? "× Zamknij" : "+ Dodaj"}
                        </button>
                    )}
                </div>
            </div>

            {canEdit && createOpen && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        className="doc-input"
                        placeholder="Nazwa kategorii"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />

                    <select
                        className="doc-select"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as CategoryType)}
                    >
                        <option value="INCOME">Przychód</option>
                        <option value="COST">Koszt</option>
                    </select>

                    <button className="doc-btn doc-btn--primary" type="button" onClick={handleCreate} disabled={saving}>
                        {saving ? "Zapisywanie…" : "Zapisz"}
                    </button>
                </div>
            )}

            {loading && <div className="doc-info">Ładowanie…</div>}
            {error && <div className="doc-error">{error}</div>}

            {!loading && !error && (
                <div className="doc-tablewrap">
                    <table className="doc-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nazwa</th>
                            <th>Typ</th>
                            <th>Akcje</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="doc-empty">
                                    Brak kategorii.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((c) => {
                                const isEditing = editId === c.id;

                                return (
                                    <tr key={c.id}>
                                        <td>{c.id}</td>

                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="doc-input"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    disabled={!canEdit}
                                                />
                                            ) : (
                                                c.name
                                            )}
                                        </td>

                                        <td>
                                            {isEditing ? (
                                                <select
                                                    className="doc-select"
                                                    value={editType}
                                                    onChange={(e) => setEditType(e.target.value as CategoryType)}
                                                    disabled={!canEdit}
                                                >
                                                    <option value="INCOME">Przychód</option>
                                                    <option value="COST">Koszt</option>
                                                </select>
                                            ) : c.type === "INCOME" ? (
                                                "Przychód"
                                            ) : c.type === "COST" ? (
                                                "Koszt"
                                            ) : (
                                                c.type
                                            )}
                                        </td>

                                        <td className="doc-actions" style={{ whiteSpace: "nowrap" }}>
                                            {!canEdit ? (
                                                <button className="doc-btn" type="button" disabled>
                                                    —
                                                </button>
                                            ) : isEditing ? (
                                                <>
                                                    <button
                                                        className="doc-btn doc-btn--primary"
                                                        type="button"
                                                        onClick={() => handleSaveEdit(c.id)}
                                                        disabled={saving}
                                                    >
                                                        Zapisz
                                                    </button>
                                                    <button
                                                        className="doc-btn doc-btn--ghost"
                                                        type="button"
                                                        onClick={cancelEdit}
                                                        disabled={saving}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Anuluj
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className="doc-btn doc-btn--edit"
                                                        type="button"
                                                        onClick={() => startEdit(c)}
                                                        disabled={saving}
                                                    >
                                                        Edytuj
                                                    </button>
                                                    <button
                                                        className="doc-btn doc-btn--danger"
                                                        type="button"
                                                        onClick={() => requestDelete(c)}
                                                        disabled={saving}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Usuń
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Usunąć kategorię?"
                    description={`Ta operacja jest nieodwracalna. Kategoria: ${deleteTarget.name}`}
                    confirmText="Usuń"
                    danger
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
};