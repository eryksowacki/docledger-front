import React, { useEffect, useMemo, useState } from "react";
import type { LedgerRow, ContractorRow } from "../types";
import { listContractors } from "../contractorService";
import { listLedger } from "../documentService";
import "./_ledgerList.css";
import { downloadKpirPdf, downloadContractorsXlsx } from "../reportService";

function formatDatePL(value?: string | null): string {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    return `${dd}.${mm}.${yyyy}`;
}

function toFiniteNumberOrNull(v: any): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function formatMoney(v: any): string {
    const n = toFiniteNumberOrNull(v);
    return n === null ? "—" : n.toFixed(2);
}

function unwrapArray<T>(res: any): T[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    return [];
}

function normalizeLedgerRow(raw: any): LedgerRow & { id?: number } {
    return {
        id: raw?.id ?? raw?.document_id ?? undefined,
        ledgerNumber: raw?.ledgerNumber ?? raw?.ledger_number ?? null,
        eventDate: raw?.eventDate ?? raw?.event_date ?? null,
        type: raw?.type,
        description: raw?.description ?? null,
        netAmount: (toFiniteNumberOrNull(raw?.netAmount ?? raw?.net_amount) ?? null) as any,
        grossAmount: (toFiniteNumberOrNull(raw?.grossAmount ?? raw?.gross_amount) ?? null) as any,
    } as any;
}

type ContractorOption = ContractorRow & { taxId?: string | null };

function ContractorCombobox(props: {
    contractors: ContractorOption[];
    value: number | null;
    onChange: (id: number | null) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
}) {
    const { contractors, value, onChange, disabled, loading, placeholder } = props;

    const selected = value ? contractors.find((c) => c.id === value) : null;

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return contractors.slice(0, 200);
        const list = contractors.filter((c) => {
            const blob = `${c.name ?? ""} ${c.taxId ?? ""}`.toLowerCase();
            return blob.includes(q);
        });
        return list.slice(0, 200);
    }, [contractors, query]);

    const wrapRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const setAll = () => {
        onChange(null);
        setQuery("");
        setOpen(false);
    };

    const pick = (id: number) => {
        onChange(id);
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={wrapRef} style={{ position: "relative" }}>
            <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        className="ledger-input"
                        value={
                            open
                                ? query
                                : selected
                                    ? `${selected.name}${selected.taxId ? ` (${selected.taxId})` : ""}`
                                    : ""
                        }
                        placeholder={placeholder ?? "Szukaj kontrahenta (nazwa/NIP) lub zostaw puste = wszyscy"}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!open) setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        disabled={disabled}
                        aria-label="Kontrahent"
                    />

                    <button
                        className="ledger-btn ledger-btn--ghost"
                        type="button"
                        onClick={() => (open ? setOpen(false) : setOpen(true))}
                        disabled={disabled}
                        title="Pokaż listę"
                    >
                        ▾
                    </button>

                    <button
                        className={`ledger-btn ledger-btn--ghost ${value === null ? "ledger-btn--active" : ""}`}
                        type="button"
                        onClick={setAll}
                        disabled={disabled}
                        title="Wszyscy kontrahenci"
                    >
                        Wszyscy
                    </button>
                </div>

                {loading && <div className="ledger-hint">Ładowanie kontrahentów…</div>}
            </div>

            {open && !disabled && (
                <div className="ledger-combo">
                    <button
                        type="button"
                        className="ledger-combo-item ledger-combo-item--all"
                        onClick={setAll}
                    >
                        Wszyscy kontrahenci
                    </button>

                    {filtered.length === 0 ? (
                        <div className="ledger-combo-empty">Brak wyników.</div>
                    ) : (
                        filtered.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className="ledger-combo-item"
                                onClick={() => pick(c.id)}
                            >
                                <div className="ledger-combo-name">{c.name}</div>
                                <div className="ledger-combo-sub">
                                    {c.taxId ? `NIP: ${c.taxId}` : "NIP: —"}
                                </div>
                            </button>
                        ))
                    )}

                    {contractors.length > 200 && query.trim() === "" && (
                        <div className="ledger-combo-hint">
                            Pokazuję pierwsze 200. Zacznij pisać, aby zawęzić listę.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const LedgerList: React.FC = () => {
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");

    const [reportOpen, setReportOpen] = useState(false);
    const [reportType, setReportType] = useState<"kpir" | "contractors">("kpir");

    const [kpirMode, setKpirMode] = useState<"month" | "quarter" | "year">("month");
    const [kpirYear, setKpirYear] = useState<number>(new Date().getFullYear());
    const [kpirMonth, setKpirMonth] = useState<number>(new Date().getMonth() + 1);
    const [kpirQuarter, setKpirQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);

    const [dateFrom, setDateFrom] = useState<string>(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [includeIncome, setIncludeIncome] = useState(true);
    const [includeCost, setIncludeCost] = useState(true);

    const [contractors, setContractors] = useState<ContractorRow[]>([]);
    const [contractorsLoading, setContractorsLoading] = useState(false);
    const [contractorId, setContractorId] = useState<number | null>(null);

    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res: any = await listLedger();

            const arr = unwrapArray<any>(res);
            const normalized = arr.map(normalizeLedgerRow);

            setRows(normalized as any);
        } catch (e) {
            console.error(e);
            setError("Nie udało się pobrać księgi (zaksięgowanych dokumentów).");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const loadContractors = async () => {
        setContractorsLoading(true);
        try {
            const res: any = await listContractors();
            const arr = unwrapArray<any>(res);

            const normalized = arr.map((c: any) => ({
                ...c,
                taxId: c?.taxId ?? c?.tax_id ?? null,
            }));

            setContractors(normalized);
        } catch (e) {
            console.error(e);
            setReportError("Nie udało się pobrać listy kontrahentów.");
            setContractors([]);
        } finally {
            setContractorsLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!reportOpen) return;
        if (reportType !== "contractors") return;

        loadContractors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportOpen, reportType]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return rows;
        return rows.filter((r: any) => (r.description ?? "").toLowerCase().includes(qq));
    }, [rows, q]);

    const openReports = () => {
        setReportError(null);
        setReportOpen(true);
    };

    const closeReports = () => {
        if (reportLoading) return;
        setReportOpen(false);
    };

    const handleDownloadKpir = async () => {
        setReportError(null);
        setReportLoading(true);

        try {
            const payload =
                kpirMode === "month"
                    ? { mode: "month", year: kpirYear, month: kpirMonth }
                    : kpirMode === "quarter"
                        ? { mode: "quarter", year: kpirYear, quarter: kpirQuarter }
                        : { mode: "year", year: kpirYear };

            await downloadKpirPdf(payload as any);
            setReportOpen(false);
        } catch (e: any) {
            setReportError(e?.message ?? "Nie udało się wygenerować raportu.");
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadContractors = async () => {
        setReportError(null);

        if (!includeIncome && !includeCost) {
            setReportError("Wybierz przynajmniej: Przychody albo Koszty.");
            return;
        }
        if (!dateFrom || !dateTo) {
            setReportError("Wybierz zakres dat.");
            return;
        }

        setReportLoading(true);
        try {
            await downloadContractorsXlsx({
                dateFrom,
                dateTo,
                includeIncome,
                includeCost,
                contractorId,
            } as any);

            setReportOpen(false);
        } catch (e: any) {
            setReportError(e?.message ?? "Nie udało się wygenerować raportu.");
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className="ledger-card">
            <div className="ledger-header">
                <div>
                    <h2>Księga</h2>
                    <p>Zaksięgowane dokumenty (BOOKED) z numerem ewidencyjnym.</p>
                </div>

                <div className="ledger-toolbar">
                    <input
                        className="ledger-input"
                        placeholder="Szukaj w opisie…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />

                    <button
                        className="ledger-btn ledger-btn--primary"
                        type="button"
                        onClick={openReports}
                        disabled={loading}
                    >
                        Raporty
                    </button>

                    <button className="ledger-btn ledger-btn--ghost" type="button" onClick={load} disabled={loading}>
                        Odśwież
                    </button>
                </div>
            </div>

            {loading && <div className="ledger-info">Ładowanie…</div>}
            {error && <div className="ledger-error">{error}</div>}

            {!loading && !error && (
                <div className="ledger-tablewrap">
                    <table className="ledger-table">
                        <thead>
                        <tr>
                            <th>Nr ewid.</th>
                            <th>Data zdarzenia</th>
                            <th>Typ</th>
                            <th>Opis</th>
                            <th className="ledger-th-right">Netto</th>
                            <th className="ledger-th-right">Brutto</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="ledger-empty">
                                    Brak pozycji w księdze.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((r: any, idx: number) => (
                                <tr key={r.ledgerNumber ?? r.id ?? idx}>
                                    <td>{r.ledgerNumber ?? "—"}</td>
                                    <td>{formatDatePL(r.eventDate)}</td>
                                    <td>{r.type === "INCOME" ? "Przychód" : r.type === "COST" ? "Koszt" : (r.type ?? "—")}</td>
                                    <td>{r.description ?? "—"}</td>
                                    <td className="ledger-td-right">{formatMoney(r.netAmount)}</td>
                                    <td className="ledger-td-right">{formatMoney(r.grossAmount)}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {reportOpen && (
                <div className="ledger-modal-backdrop" onClick={closeReports}>
                    <div className="ledger-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ledger-modal-head">
                            <h3>Generowanie raportu</h3>
                            <button
                                className="ledger-btn ledger-btn--ghost"
                                type="button"
                                onClick={closeReports}
                                disabled={reportLoading}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="ledger-modal-body">
                            {reportError && (
                                <div className="ledger-error ledger-error--scroll">
                                    <pre className="ledger-error-pre">{reportError}</pre>
                                </div>
                            )}

                            <label className="ledger-label">
                                Typ raportu
                                <select
                                    className="ledger-input"
                                    value={reportType}
                                    onChange={(e) => {
                                        const next = e.target.value as "kpir" | "contractors";
                                        setReportType(next);
                                        setReportError(null);
                                        if (next === "contractors") {
                                            loadContractors();
                                        }
                                    }}
                                    disabled={reportLoading}
                                >
                                    <option value="kpir">KPiR (PDF)</option>
                                    <option value="contractors">Raport kontrahenci (Excel)</option>
                                </select>
                            </label>

                            {reportType === "kpir" ? (
                                <div style={{ display: "grid", gap: 10 }}>
                                    <label className="ledger-label">
                                        Okres
                                        <select
                                            className="ledger-input"
                                            value={kpirMode}
                                            onChange={(e) => setKpirMode(e.target.value as any)}
                                            disabled={reportLoading}
                                        >
                                            <option value="month">Miesiąc</option>
                                            <option value="quarter">Kwartał</option>
                                            <option value="year">Rok</option>
                                        </select>
                                    </label>

                                    <label className="ledger-label">
                                        Rok
                                        <input
                                            className="ledger-input"
                                            type="number"
                                            value={kpirYear}
                                            onChange={(e) => setKpirYear(Number(e.target.value))}
                                            min={2000}
                                            max={2100}
                                            disabled={reportLoading}
                                        />
                                    </label>

                                    {kpirMode === "month" && (
                                        <label className="ledger-label">
                                            Miesiąc
                                            <input
                                                className="ledger-input"
                                                type="number"
                                                value={kpirMonth}
                                                onChange={(e) => setKpirMonth(Number(e.target.value))}
                                                min={1}
                                                max={12}
                                                disabled={reportLoading}
                                            />
                                        </label>
                                    )}

                                    {kpirMode === "quarter" && (
                                        <label className="ledger-label">
                                            Kwartał
                                            <input
                                                className="ledger-input"
                                                type="number"
                                                value={kpirQuarter}
                                                onChange={(e) => setKpirQuarter(Number(e.target.value))}
                                                min={1}
                                                max={4}
                                                disabled={reportLoading}
                                            />
                                        </label>
                                    )}

                                    <button
                                        className="ledger-btn ledger-btn--primary"
                                        type="button"
                                        disabled={reportLoading}
                                        onClick={handleDownloadKpir}
                                    >
                                        {reportLoading ? "Generowanie…" : "Pobierz PDF"}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 10 }}>
                                    <label className="ledger-label">
                                        Od
                                        <input
                                            className="ledger-input"
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            disabled={reportLoading}
                                        />
                                    </label>

                                    <label className="ledger-label">
                                        Do
                                        <input
                                            className="ledger-input"
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            disabled={reportLoading}
                                        />
                                    </label>

                                    <label className="ledger-label">
                                        Kontrahent
                                        <ContractorCombobox
                                            contractors={contractors as any}
                                            value={contractorId}
                                            onChange={setContractorId}
                                            disabled={reportLoading}
                                            loading={contractorsLoading}
                                            placeholder="Szukaj (nazwa/NIP)… (puste = wszyscy)"
                                        />
                                    </label>

                                    <div className="checks">
                                        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={includeIncome}
                                                onChange={(e) => setIncludeIncome(e.target.checked)}
                                                disabled={reportLoading}
                                            />
                                            Przychody
                                        </label>
                                        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={includeCost}
                                                onChange={(e) => setIncludeCost(e.target.checked)}
                                                disabled={reportLoading}
                                            />
                                            Koszty
                                        </label>
                                    </div>

                                    <button
                                        className="ledger-btn ledger-btn--primary"
                                        type="button"
                                        disabled={reportLoading || (!includeIncome && !includeCost)}
                                        onClick={handleDownloadContractors}
                                    >
                                        {reportLoading ? "Generowanie…" : "Pobierz Excel"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};