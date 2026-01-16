import React, { useEffect, useMemo, useState } from "react";
import type {
    DocumentCreateRequest,
    DocumentRow,
    DocumentStatus,
    DocumentType,
    User,
} from "../types";
import { bookDocument, createDocument, listDocuments } from "../documentService";
import { DocumentModal } from "./DocumentModal";
import "./_documentList.css";

type Props = {
    user: User;
};

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "all", label: "Wszystkie" },
    { value: "INCOME", label: "Przychód" },
    { value: "COST", label: "Koszt" },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "all", label: "Wszystkie" },
    { value: "BUFFER", label: "Bufor" },
    { value: "BOOKED", label: "Zaksięgowane" },
];

function formatDatePL(value?: string | null): string {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    return `${dd}.${mm}.${yyyy}`;
}

function toNumberOrNull(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function formatMoney(v: unknown): string {
    const n = toNumberOrNull(v);
    return n === null ? "—" : n.toFixed(2);
}

function getField<T = any>(obj: any, camel: string, snake: string): T | undefined {
    if (!obj) return undefined;
    if (obj[camel] !== undefined) return obj[camel] as T;
    if (obj[snake] !== undefined) return obj[snake] as T;
    return undefined;
}

export const DocumentList: React.FC<Props> = ({ user }) => {
    const [docs, setDocs] = useState<DocumentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<string>("all");
    const [status, setStatus] = useState<string>("all");
    const [q, setQ] = useState("");

    const [createOpen, setCreateOpen] = useState(false);

    const canBook =
        user.role === "ROLE_MANAGER" || (user.roles ?? []).includes("ROLE_MANAGER");

    const normalizeStatus = (s: string) => {
        const up = (s ?? "").toUpperCase();
        if (up === "BUF") return "BUFFER";
        if (up === "BUFFER") return "BUFFER";
        if (up === "BOOKED") return "BOOKED";
        return up;
    };

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listDocuments({
                type: type === "all" ? undefined : (type as DocumentType),
                status: status === "all" ? undefined : (status as DocumentStatus),
            });
            setDocs(Array.isArray(data) ? data : ([] as any));
        } catch (e) {
            console.error(e);
            setError("Nie udało się pobrać dokumentów.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, status]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return docs;

        return docs.filter((d: any) => {
            const desc = (getField<string | null>(d, "description", "description") ?? "").toLowerCase();
            return desc.includes(qq);
        });
    }, [docs, q]);

    const handleBook = async (docId: number) => {
        if (!canBook) return;

        try {
            await bookDocument(docId);
            await load();
        } catch (e) {
            console.error(e);
            alert("Nie udało się zaksięgować dokumentu.");
        }
    };

    const handleCreate = async (payload: DocumentCreateRequest) => {
        await createDocument(payload);
        await load();
    };

    return (
        <div className="doc-card">
            <div className="doc-header">
                <div>
                    <h2>Dokumenty</h2>
                    <p>
                        Filtruj po typie/statusie. Dokumenty w buforze może księgować tylko
                        kierownik.
                    </p>
                </div>

                <div className="doc-toolbar">
                    <input
                        className="doc-input"
                        placeholder="Szukaj w opisie…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />

                    <select
                        className="doc-select"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        {TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="doc-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    <button
                        className="doc-btn doc-btn--ghost"
                        type="button"
                        onClick={load}
                        disabled={loading}
                    >
                        Odśwież
                    </button>

                    <button
                        className="doc-btn doc-btn--primary"
                        type="button"
                        onClick={() => setCreateOpen(true)}
                    >
                        + Dodaj
                    </button>
                </div>
            </div>

            {loading && <div className="doc-info">Ładowanie…</div>}
            {error && <div className="doc-error">{error}</div>}

            {!loading && !error && (
                <div className="doc-tablewrap">
                    <table className="doc-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Data zdarzenia</th>
                            <th>Typ</th>
                            <th>Opis</th>
                            <th>Status</th>
                            <th>Nr ewid.</th>
                            <th className="doc-th-right">Netto</th>
                            <th className="doc-th-right">VAT</th>
                            <th className="doc-th-right">Brutto</th>
                            <th>Akcje</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="doc-empty">
                                    Brak dokumentów dla wybranych filtrów.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((d: any) => {
                                const st = normalizeStatus(getField<string>(d, "status", "status") ?? "");
                                const isBuffer = st === "BUFFER";

                                const eventDate = getField<string | null>(d, "eventDate", "event_date");
                                const ledgerNumber = getField<number | string | null>(d, "ledgerNumber", "ledger_number");

                                const net = getField(d, "netAmount", "net_amount");
                                const vat = getField(d, "vatAmount", "vat_amount");
                                const gross = getField(d, "grossAmount", "gross_amount");

                                const docType = getField<string>(d, "type", "type") ?? "";

                                return (
                                    <tr key={d.id}>
                                        <td>{d.id}</td>
                                        <td>{formatDatePL(eventDate)}</td>
                                        <td>
                                            {docType === "INCOME"
                                                ? "Przychód"
                                                : docType === "COST"
                                                    ? "Koszt"
                                                    : docType}
                                        </td>
                                        <td>{(getField<string | null>(d, "description", "description") ?? "—")}</td>
                                        <td>
                                            {isBuffer ? (
                                                <span className="doc-badge doc-badge--muted">BUFFER</span>
                                            ) : (
                                                <span className="doc-badge doc-badge--ok">BOOKED</span>
                                            )}
                                        </td>
                                        <td>{ledgerNumber ?? "—"}</td>
                                        <td className="doc-td-right">{formatMoney(net)}</td>
                                        <td className="doc-td-right">{formatMoney(vat)}</td>
                                        <td className="doc-td-right">{formatMoney(gross)}</td>
                                        <td>
                                            {isBuffer ? (
                                                canBook ? (
                                                    <button
                                                        className="doc-btn doc-btn--primary"
                                                        type="button"
                                                        onClick={() => handleBook(d.id)}
                                                    >
                                                        Księguj
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="doc-btn"
                                                        type="button"
                                                        disabled
                                                        title="Tylko kierownik może księgować dokumenty"
                                                    >
                                                        —
                                                    </button>
                                                )
                                            ) : (
                                                <button className="doc-btn" type="button" disabled>
                                                    ✓
                                                </button>
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

            {createOpen && (
                <DocumentModal
                    onClose={() => setCreateOpen(false)}
                    onSubmit={handleCreate}
                />
            )}
        </div>
    );
};