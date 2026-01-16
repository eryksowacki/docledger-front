import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryRow, ContractorRow, DocumentCreateRequest, DocumentType } from "../types";
import { listCategories } from "../categoryService";
import { listContractors } from "../contractorService";
import "./_documentModal.css";

type Props = {
    onClose: () => void;
    onSubmit: (payload: DocumentCreateRequest) => Promise<void>;
};

const TYPE_OPTIONS: Array<{ value: DocumentType; label: string }> = [
    { value: "INCOME", label: "Przychód" },
    { value: "COST", label: "Koszt" },
];

function todayISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function toMoneyString(n: number): string {
    if (!Number.isFinite(n)) return "0.00";
    return n.toFixed(2);
}

function parseNumberSafe(s: string): number | null {
    const normalized = (s ?? "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}

function getApiMessage(err: any): string | null {
    const msg = err?.data?.message ?? err?.response?.data?.message ?? err?.message;
    return typeof msg === "string" && msg.trim() ? msg : null;
}

export const DocumentModal: React.FC<Props> = ({ onClose, onSubmit }) => {
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");

    const [type, setType] = useState<DocumentType>("COST");
    const [issueDate, setIssueDate] = useState(todayISO());
    const [eventDate, setEventDate] = useState(todayISO());
    const [description, setDescription] = useState<string>("");

    const [netAmount, setNetAmount] = useState<string>("0.00");
    const [vatAmount, setVatAmount] = useState<string>("0.00");
    const [grossAmount, setGrossAmount] = useState<string>("0.00");

    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [contractors, setContractors] = useState<ContractorRow[]>([]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [contractorId, setContractorId] = useState<number | null>(null);

    const [contractorQuery, setContractorQuery] = useState("");
    const [contractorOpen, setContractorOpen] = useState(false);
    const blurTimerRef = useRef<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    useEffect(() => {
        const n = parseNumberSafe(netAmount);
        const vatPct = parseNumberSafe(vatAmount);
        if (n === null || vatPct === null) return;

        const gross = n * (1 + vatPct / 100);
        setGrossAmount(toMoneyString(gross));
    }, [netAmount, vatAmount]);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [cats, cons] = await Promise.all([listCategories({ type }), listContractors()]);
                if (!alive) return;

                setCategories(cats);
                setContractors(cons);

                if (!cats.some((c) => c.id === categoryId)) setCategoryId(null);

                if (contractorId !== null && !cons.some((c) => c.id === contractorId)) {
                    setContractorId(null);
                    setContractorQuery("");
                } else if (contractorId !== null) {
                    const selected = cons.find((x) => x.id === contractorId);
                    if (selected) {
                        setContractorQuery(`${selected.name}${selected.taxId ? ` (${selected.taxId})` : ""}`);
                    }
                }
            } catch (e) {
                console.error(e);
                if (!alive) return;
                setError("Nie udało się pobrać kategorii/kontrahentów.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    const numbersOk = useMemo(() => {
        const n = parseNumberSafe(netAmount);
        const v = parseNumberSafe(vatAmount);
        return n !== null && v !== null;
    }, [netAmount, vatAmount]);

    const filteredContractors = useMemo(() => {
        const q = contractorQuery.trim().toLowerCase();
        if (!q) return contractors;

        return contractors.filter((c) => {
            const name = (c.name ?? "").toLowerCase();
            const nip = (c.taxId ?? "").toLowerCase();
            return name.includes(q) || nip.includes(q);
        });
    }, [contractors, contractorQuery]);

    const clearBlurTimer = () => {
        if (blurTimerRef.current) {
            window.clearTimeout(blurTimerRef.current);
            blurTimerRef.current = null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!invoiceNumber.trim()) {
            setError("Numer faktury jest wymagany.");
            return;
        }

        if (!numbersOk) {
            setError("Kwoty (Netto i VAT) muszą być liczbami.");
            return;
        }

        const n = parseNumberSafe(netAmount)!;
        const vatPct = parseNumberSafe(vatAmount)!;

        const vatValue = n * (vatPct / 100);
        const g = n + vatValue;

        const payload: DocumentCreateRequest = {
            invoiceNumber: invoiceNumber.trim(),
            type,
            issueDate,
            eventDate,
            description: description.trim() ? description.trim() : null,
            netAmount: n,
            vatAmount: vatValue,
            grossAmount: g,
            categoryId,
            contractorId,
        };

        setSaving(true);
        try {
            await onSubmit(payload);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(getApiMessage(err) ?? "Nie udało się dodać dokumentu.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dm-backdrop" onClick={onClose}>
            <div className="dm-card" onClick={(e) => e.stopPropagation()}>
                <div className="dm-head">
                    <div>
                        <div className="dm-title">Dodaj dokument</div>
                        <div className="dm-subtitle">Zapisze się w buforze (BUFFER).</div>
                    </div>

                    <button type="button" className="dm-x" onClick={onClose} aria-label="Zamknij">
                        ✕
                    </button>
                </div>

                {error && <div className="dm-error">{error}</div>}
                {loading && <div className="dm-info">Ładowanie danych…</div>}

                <form className="dm-form" onSubmit={handleSubmit}>
                    <div className="dm-grid">
                        <label className="dm-label dm-span-2">
                            Numer faktury
                            <input
                                type="text"
                                className="dm-input"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="np. FV/12/2025"
                                required
                            />
                        </label>

                        <div className="dm-span-2" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                            <label className="dm-label">
                                Typ
                                <select
                                    className="dm-input"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as DocumentType)}
                                >
                                    {TYPE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="dm-label">
                                Data wystawienia
                                <input
                                    type="date"
                                    className="dm-input"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="dm-label">
                                Data zdarzenia
                                <input
                                    type="date"
                                    className="dm-input"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    required
                                />
                            </label>
                        </div>

                        <label className="dm-label dm-span-2">
                            Opis
                            <input
                                type="text"
                                className="dm-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="np. Zakup materiałów"
                            />
                        </label>

                        <div className="dm-span-2" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                            <label className="dm-label">
                                Netto
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="dm-input"
                                    value={netAmount}
                                    onChange={(e) => setNetAmount(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="dm-label">
                                VAT
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="dm-input"
                                    value={vatAmount}
                                    onChange={(e) => setVatAmount(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="dm-label">
                                Brutto
                                <input type="text" className="dm-input" value={grossAmount} readOnly aria-readonly="true" />
                            </label>
                        </div>

                        <label className="dm-label dm-span-2">
                            Kategoria (opcjonalnie)
                            <select
                                className="dm-input"
                                value={categoryId ?? ""}
                                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">— brak —</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="dm-label dm-span-2">
                            Kontrahent (opcjonalnie)

                            <div className="dm-combobox">
                                <input
                                    type="text"
                                    className="dm-input"
                                    value={contractorQuery}
                                    placeholder="Wyszukaj kontrahenta po nazwie lub NIP…"
                                    onChange={(e) => {
                                        setContractorQuery(e.target.value);
                                        setContractorOpen(true);
                                        if (contractorId !== null) setContractorId(null);
                                    }}
                                    onFocus={() => {
                                        clearBlurTimer();
                                        setContractorOpen(true);
                                    }}
                                    onBlur={() => {
                                        clearBlurTimer();
                                        blurTimerRef.current = window.setTimeout(() => setContractorOpen(false), 140);
                                    }}
                                />

                                {contractorOpen && (
                                    <div className="dm-combo-list" role="listbox">
                                        <button
                                            type="button"
                                            className="dm-combo-item dm-combo-item--muted"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setContractorId(null);
                                                setContractorQuery("");
                                                setContractorOpen(false);
                                            }}
                                        >
                                            — brak —
                                        </button>

                                        {filteredContractors.length === 0 ? (
                                            <div className="dm-combo-empty">Brak wyników.</div>
                                        ) : (
                                            filteredContractors.slice(0, 80).map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    className="dm-combo-item"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setContractorId(c.id);
                                                        setContractorQuery(`${c.name}${c.taxId ? ` (${c.taxId})` : ""}`);
                                                        setContractorOpen(false);
                                                    }}
                                                >
                                                    <span className="dm-combo-name">{c.name}</span>
                                                    {c.taxId ? <span className="dm-combo-nip">{c.taxId}</span> : null}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    <div className="dm-actions">
                        <button type="button" className="dm-btn dm-btn--ghost" onClick={onClose} disabled={saving}>
                            Anuluj
                        </button>
                        <button type="submit" className="dm-btn dm-btn--primary" disabled={saving || loading}>
                            {saving ? "Zapisywanie…" : "Dodaj"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DocumentModal;