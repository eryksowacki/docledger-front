// src/documentService.ts
import { apiFetch } from "./api";
import type {
    DocumentRow,
    DocumentCreateRequest,
    DocumentCreateResponse,
    DocumentBookResponse,
    DocumentListQuery,
    LedgerRow,
} from "./types";

function buildQuery(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") qs.set(k, v);
    });
    const s = qs.toString();
    return s ? `?${s}` : "";
}

/**
 * Backend może zwracać:
 * - [] (idealnie)
 * - { data: [] } (Laravel Resource / paginator)
 * - { items: [] } / { rows: [] } (custom)
 *
 * Ta funkcja zawsze zwróci TABLICĘ, żeby .map() nie wybuchał.
 */
function unwrapList<T>(payload: any): T[] {
    if (Array.isArray(payload)) return payload;

    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.rows)) return payload.rows;

    // w dev warto zobaczyć co przyszło
    console.warn("Expected array from API, got:", payload);
    return [];
}

export async function listDocuments(query: DocumentListQuery = {}): Promise<DocumentRow[]> {
    const q = buildQuery({
        type: query.type,
        status: query.status,
    });

    const res = await apiFetch<any>(`/api/documents${q}`);
    return unwrapList<DocumentRow>(res);
}

export async function createDocument(payload: DocumentCreateRequest): Promise<DocumentCreateResponse> {
    return apiFetch<DocumentCreateResponse>("/api/documents", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function bookDocument(id: number): Promise<DocumentBookResponse> {
    return apiFetch<DocumentBookResponse>(`/api/documents/${id}/book`, {
        method: "POST",
    });
}

export async function listLedger(): Promise<LedgerRow[]> {
    const res = await apiFetch<any>("/api/ledger");
    return unwrapList<LedgerRow>(res);
}