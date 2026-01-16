import React, { useEffect, useMemo, useState } from "react";
import type { Company, CompanyCreateRequest, CompanyUpdateRequest } from "../types";
import "./_companyList.css";

type Mode = "create" | "edit";

interface CompanyModalProps {
    mode: Mode;
    company?: Company;
    onClose: () => void;
    onSubmit: (payload: CompanyCreateRequest | CompanyUpdateRequest) => Promise<void>;
}

function normalizeNip(input: string): string {
    return (input ?? "").replace(/\D/g, "");
}

function isValidNip(nipDigits: string): boolean {
    if (nipDigits === "") return true;
    if (!/^\d{10}$/.test(nipDigits)) return false;

    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(nipDigits[i]) * weights[i];

    const check = sum % 11;
    if (check === 10) return false;

    return check === Number(nipDigits[9]);
}

type AddressFields = {
    street: string;
    buildingNo: string;
    apartmentNo: string;
    postalCode: string;
    city: string;
};

function emptyAddress(): AddressFields {
    return { street: "", buildingNo: "", apartmentNo: "", postalCode: "", city: "" };
}

function normalizePostalCode(input: string): string {
    const digits = (input ?? "").replace(/\D/g, "").slice(0, 5);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function isValidPostalCode(pc: string): boolean {
    if (!pc) return true;
    return /^\d{2}-\d{3}$/.test(pc);
}

function composeAddress(a: AddressFields): string {
    const streetRaw = (a.street ?? "").trim();

    const streetNoPrefix = streetRaw.replace(/^(?:ul\.?\s*)+/i, "").trim();

    const building = (a.buildingNo ?? "").trim();
    const apartment = (a.apartmentNo ?? "").trim();

    const streetPart = streetNoPrefix
        ? ["ul.", streetNoPrefix, building].filter(Boolean).join(" ")
        : [building].filter(Boolean).join(" ");

    const aptPart = apartment ? `/${apartment}` : "";
    const line1 = streetPart ? `${streetPart}${aptPart}` : "";

    const postal = (a.postalCode ?? "").trim();
    const city = (a.city ?? "").trim();
    const line2 = [postal, city].filter(Boolean).join(" ");

    return [line1, line2].filter(Boolean).join(", ");
}

function parseAddress(raw: string | null | undefined): AddressFields {
    if (!raw) return emptyAddress();

    const s = raw.trim();

    const pcCityMatch = s.match(/(\d{2}-\d{3})\s+([^,]+)$/);
    const postalCode = pcCityMatch?.[1] ?? "";
    const city = pcCityMatch?.[2]?.trim() ?? "";

    let rest = s;
    if (pcCityMatch) {
        rest = s.slice(0, pcCityMatch.index).replace(/[, ]+$/, "");
    }

    const numMatch = rest.match(/(.+?)\s+(\d+[A-Za-z]?)\s*(?:\/\s*(\d+[A-Za-z]?))?$/);

    const street = numMatch?.[1]?.trim() ?? rest.replace(/[, ]+$/, "").trim();
    const buildingNo = numMatch?.[2]?.trim() ?? "";
    const apartmentNo = numMatch?.[3]?.trim() ?? "";

    return {
        street: street ?? "",
        buildingNo,
        apartmentNo,
        postalCode,
        city,
    };
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ mode, company, onClose, onSubmit }) => {
    const isEdit = mode === "edit";

    const [name, setName] = useState("");
    const [taxId, setTaxId] = useState("");
    const [active, setActive] = useState(true);

    const [vatActive, setVatActive] = useState(false);

    const [addr, setAddr] = useState<AddressFields>(emptyAddress());

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isEdit && company) {
            setName(company.name ?? "");
            setTaxId(company.taxId ?? "");
            setActive(Boolean(company.active));

            setVatActive(Boolean((company as any).vatActive));

            setAddr(parseAddress(company.address));
        } else {
            setName("");
            setTaxId("");
            setActive(true);

            setVatActive(false);

            setAddr(emptyAddress());
        }
    }, [isEdit, company]);

    const composedAddress = useMemo(() => {
        const s = composeAddress(addr);
        return s.trim() === "" ? null : s;
    }, [addr]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (name.trim().length < 2) {
            setError("Nazwa firmy jest wymagana (min. 2 znaki).");
            return;
        }

        const nipDigits = normalizeNip(taxId);
        if (!isValidNip(nipDigits)) {
            setError("Niepoprawny NIP (musi mieć 10 cyfr i poprawną sumę kontrolną).");
            return;
        }

        if (!isValidPostalCode(addr.postalCode.trim())) {
            setError("Niepoprawny kod pocztowy (format 00-000).");
            return;
        }

        setSaving(true);
        try {
            const payload: CompanyCreateRequest | CompanyUpdateRequest = {
                name: name.trim(),
                taxId: nipDigits === "" ? null : nipDigits,
                address: composedAddress,
                active,
                vatActive,
            };

            await onSubmit(payload);
            onClose();
        } catch (err: any) {
            console.error(err);

            if (err?.status === 409) {
                setError("Firma z takim NIP już istnieje w systemie.");
            } else if (err?.status === 400) {
                setError(err?.data?.message ?? "Błędne dane wejściowe.");
            } else {
                setError("Nie udało się zapisać firmy. Sprawdź dane i spróbuj ponownie.");
            }
        } finally {
            setSaving(false);
        }
    };

    const title = isEdit ? "Edytuj firmę" : "Dodaj nową firmę";
    const subtitle = isEdit ? "Zmień dane firmy i zapisz." : "Uzupełnij dane firmy, aby dodać ją do systemu.";

    return (
        <div className="company-modal-backdrop" onMouseDown={onClose}>
            <div
                className="company-modal"
                onMouseDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="company-modal-header">
                    <div>
                        <h3 className="company-modal-title">{title}</h3>
                        <p className="company-modal-subtitle">{subtitle}</p>
                    </div>
                    <button type="button" className="company-btn company-btn--ghost" onClick={onClose}>
                        Zamknij
                    </button>
                </div>

                <form onSubmit={submit}>
                    <div className="company-modal-body">
                        {error && <div className="company-inline-error">{error}</div>}

                        <div className="company-field">
                            <div className="company-label">Nazwa</div>
                            <input
                                className="company-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="np. ABC Sp. z o.o."
                                autoFocus
                            />
                        </div>

                        <div className="company-field">
                            <div className="company-label">NIP</div>
                            <input
                                className="company-input"
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                                placeholder="np. 1234567890"
                                inputMode="numeric"
                            />
                        </div>

                        <div className="company-field">
                            <div className="company-label">Ulica</div>
                            <input
                                className="company-input"
                                value={addr.street}
                                onChange={(e) => setAddr((p) => ({ ...p, street: e.target.value }))}
                                placeholder="np. Marszałkowska"
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <div className="company-field" style={{ flex: "1 1 160px" }}>
                                <div className="company-label">Nr budynku</div>
                                <input
                                    className="company-input"
                                    value={addr.buildingNo}
                                    onChange={(e) => setAddr((p) => ({ ...p, buildingNo: e.target.value }))}
                                    placeholder="np. 10A"
                                />
                            </div>

                            <div className="company-field" style={{ flex: "1 1 160px" }}>
                                <div className="company-label">Nr lokalu</div>
                                <input
                                    className="company-input"
                                    value={addr.apartmentNo}
                                    onChange={(e) => setAddr((p) => ({ ...p, apartmentNo: e.target.value }))}
                                    placeholder="np. 12"
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <div className="company-field" style={{ flex: "1 1 160px" }}>
                                <div className="company-label">Kod pocztowy</div>
                                <input
                                    className="company-input"
                                    value={addr.postalCode}
                                    onChange={(e) =>
                                        setAddr((p) => ({ ...p, postalCode: normalizePostalCode(e.target.value) }))
                                    }
                                    placeholder="00-000"
                                    inputMode="numeric"
                                />
                            </div>

                            <div className="company-field" style={{ flex: "2 1 240px" }}>
                                <div className="company-label">Miasto</div>
                                <input
                                    className="company-input"
                                    value={addr.city}
                                    onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))}
                                    placeholder="np. Warszawa"
                                />
                            </div>
                        </div>

                        <div className="company-field">
                            <div className="company-label">Adres (zapisany w systemie)</div>
                            <input className="company-input" value={composedAddress ?? ""} readOnly />
                        </div>

                        <label className="company-checkbox-row">
                            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                            Firma aktywna
                        </label>

                        <label className="company-checkbox-row">
                            <input
                                type="checkbox"
                                checked={vatActive}
                                onChange={(e) => setVatActive(e.target.checked)}
                            />
                            Czynny podatnik VAT?
                        </label>
                    </div>

                    <div className="company-modal-footer">
                        <button
                            type="button"
                            className="company-btn company-btn--ghost"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Anuluj
                        </button>
                        <button type="submit" className="company-btn company-btn--primary" disabled={saving}>
                            {saving ? "Zapisywanie..." : "Zapisz"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};