import React, { useEffect, useMemo, useState } from "react";
import type { ContractorRow, User } from "../types";
import {
    createContractor,
    deleteContractor,
    listContractors,
    updateContractor,
} from "../contractorService";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
    user: User;
};

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

function hasRole(user: User, role: string): boolean {
    const roles = Array.isArray((user as any).roles) ? (user as any).roles : [];
    const single = typeof (user as any).role === "string" ? (user as any).role : "";
    return single === role || roles.includes(role);
}

export const ContractorList: React.FC<Props> = ({ user }) => {
    const canWrite = useMemo(() => {
        return (
            hasRole(user, "ROLE_EMPLOYEE") ||
            hasRole(user, "ROLE_MANAGER") ||
            hasRole(user, "ROLE_SYSTEM_ADMIN")
        );
    }, [user]);

    const canDelete = useMemo(() => {
        return hasRole(user, "ROLE_MANAGER") || hasRole(user, "ROLE_SYSTEM_ADMIN");
    }, [user]);

    const [items, setItems] = useState<ContractorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [q, setQ] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newTaxId, setNewTaxId] = useState<string>("");
    const [newAddress, setNewAddress] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editTaxId, setEditTaxId] = useState<string>("");
    const [editAddress, setEditAddress] = useState<string>("");

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listContractors();
            setItems(data);
        } catch (e) {
            console.error(e);
            setError("Nie udało się pobrać kontrahentów.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return items;
        return items.filter((c) => {
            const blob = `${c.name ?? ""} ${c.taxId ?? ""} ${c.address ?? ""}`.toLowerCase();
            return blob.includes(qq);
        });
    }, [items, q]);

    const startEdit = (c: ContractorRow) => {
        if (!canWrite) return;
        setEditId(c.id);
        setEditName(c.name ?? "");
        setEditTaxId(c.taxId ?? "");
        setEditAddress(c.address ?? "");
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditName("");
        setEditTaxId("");
        setEditAddress("");
    };

    const handleCreate = async () => {
        if (!canWrite) return;

        setError(null);
        const name = newName.trim();
        if (!name) {
            setError("Podaj nazwę kontrahenta.");
            return;
        }

        setSaving(true);
        try {
            await createContractor({
                name,
                taxId: newTaxId.trim() ? newTaxId.trim() : null,
                address: newAddress.trim() ? newAddress.trim() : null,
            });
            setNewName("");
            setNewTaxId("");
            setNewAddress("");
            setCreateOpen(false);
            await load();
        } catch (e) {
            console.error(e);
            setError(getApiErrorMessage(e) ?? "Nie udało się dodać kontrahenta.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async (id: number) => {
        if (!canWrite) return;

        setError(null);
        const name = editName.trim();
        if (!name) {
            setError("Nazwa nie może być pusta.");
            return;
        }

        setSaving(true);
        try {
            await updateContractor(id, {
                name,
                taxId: editTaxId.trim() ? editTaxId.trim() : null,
                address: editAddress.trim() ? editAddress.trim() : null,
            });
            cancelEdit();
            await load();
        } catch (e) {
            console.error(e);
            setError(getApiErrorMessage(e) ?? "Nie udało się zapisać zmian.");
        } finally {
            setSaving(false);
        }
    };

    const requestDelete = (c: ContractorRow) => {
        if (!canDelete) return;
        setError(null);
        setDeleteTarget({ id: c.id, name: c.name ?? `ID ${c.id}` });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        setSaving(true);
        setError(null);

        try {
            await deleteContractor(deleteTarget.id);

            if (editId === deleteTarget.id) cancelEdit();
            setDeleteTarget(null);
            await load();
        } catch (e) {
            const msg = getApiErrorMessage(e) ?? "Nie udało się usunąć kontrahenta.";
            throw new Error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="doc-card">
            <div className="doc-header">
                <div>
                    <h2>Kontrahenci</h2>
                    <p>
                        Lista kontrahentów w Twojej firmie.{" "}
                        {canWrite ? "Możesz dodawać i edytować." : "Masz tylko podgląd."}{" "}
                        {canDelete ? "Możesz też usuwać." : ""}
                    </p>
                </div>

                <div className="doc-toolbar">
                    <input
                        className="doc-input"
                        placeholder="Szukaj (nazwa/NIP/adres)…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />

                    <button className="doc-btn doc-btn--ghost" type="button" onClick={load} disabled={loading}>
                        Odśwież
                    </button>

                    {canWrite && (
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

            {canWrite && createOpen && (
                <div className="doc-row">
                    <input
                        className="doc-input"
                        placeholder="Nazwa"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <input
                        className="doc-input"
                        placeholder="NIP (opcjonalnie)"
                        value={newTaxId}
                        onChange={(e) => setNewTaxId(e.target.value)}
                    />
                    <input
                        className="doc-input"
                        placeholder="Adres (opcjonalnie)"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        style={{ minWidth: 260 }}
                    />

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
                            <th>NIP</th>
                            <th>Adres</th>
                            <th>Akcje</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="doc-empty">
                                    Brak kontrahentów.
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
                                                <input className="doc-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                            ) : (
                                                c.name
                                            )}
                                        </td>

                                        <td>
                                            {isEditing ? (
                                                <input className="doc-input" value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} />
                                            ) : (
                                                c.taxId ?? "—"
                                            )}
                                        </td>

                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="doc-input"
                                                    value={editAddress}
                                                    onChange={(e) => setEditAddress(e.target.value)}
                                                    style={{ minWidth: 260 }}
                                                />
                                            ) : (
                                                c.address ?? "—"
                                            )}
                                        </td>

                                        <td style={{ whiteSpace: "nowrap" }}>
                                            {!canWrite ? (
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
                                                        disabled={saving || !canDelete}
                                                        style={{ marginLeft: 8, opacity: canDelete ? 1 : 0.55 }}
                                                        title={canDelete ? "Usuń kontrahenta" : "Brak uprawnień do usuwania"}
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
                    title="Usunąć kontrahenta?"
                    description={`Ta operacja jest nieodwracalna. Kontrahent: ${deleteTarget.name}`}
                    confirmText="Usuń"
                    danger
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
};