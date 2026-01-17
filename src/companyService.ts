// src/companyService.ts

import { apiFetch } from "./api";
import type {
    Company,
    CompanyCreateRequest,
    CompanyUpdateRequest,
    CompanyUserRow,
} from "./types";

export type CompanySort = "id" | "name" | "taxId" | "active";
export type SortDir = "asc" | "desc";

export interface CompanyListParams {
    q?: string;
    active?: boolean;
    sort?: CompanySort;
    dir?: SortDir;
}

function buildQuery(params?: CompanyListParams): string {
    if (!params) return "";
    const qs = new URLSearchParams();

    if (params.q && params.q.trim() !== "") qs.set("q", params.q.trim());
    if (typeof params.active === "boolean") qs.set("active", String(params.active));
    if (params.sort) qs.set("sort", params.sort);
    if (params.dir) qs.set("dir", params.dir);

    const str = qs.toString();
    return str ? `?${str}` : "";
}

/**
 * Backend może zwracać:
 * - Company[]
 * - { data: Company[] }
 * - { data: Company[], meta, links } (paginacja)
 */
type CompaniesApiResponse =
    | Company[]
    | { data: Company[] }
    | { data: Company[]; meta?: any; links?: any };

function normalizeCompanies(resp: CompaniesApiResponse): Company[] {
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray((resp as any).data)) return (resp as any).data;
    return [];
}

export async function listCompanies(params?: CompanyListParams): Promise<Company[]> {
    const query = buildQuery(params);
    const resp = await apiFetch<CompaniesApiResponse>(`/api/admin/companies${query}`, {
        method: "GET",
    });
    return normalizeCompanies(resp);
}

export async function getCompany(id: number): Promise<Company> {
    return apiFetch<Company>(`/api/admin/companies/${id}`, { method: "GET" });
}

export async function createCompany(payload: CompanyCreateRequest): Promise<Company> {
    return apiFetch<Company>(`/api/admin/companies`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateCompany(
    id: number,
    payload: CompanyUpdateRequest
): Promise<Company> {
    return apiFetch<Company>(`/api/admin/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

/**
 * Ważne: używamy apiFetch, żeby:
 * - wysyłać cookies (credentials: include)
 * - wysyłać XSRF token (X-XSRF-TOKEN)
 * - mieć spójne parsowanie błędów
 */
export async function deleteCompany(id: number): Promise<void> {
    await apiFetch<void>(`/api/admin/companies/${id}`, { method: "DELETE" });
}

export async function listCompanyUsers(companyId: number): Promise<CompanyUserRow[]> {
    return apiFetch<CompanyUserRow[]>(
        `/api/admin/companies/${companyId}/users`,
        { method: "GET" }
    );
}