// src/types.ts

export type Role =
    | "ROLE_SYSTEM_ADMIN"
    // | "ROLE_COMPANY_ADMIN"
    | "ROLE_MANAGER"
    | "ROLE_EMPLOYEE"
    | string;

export interface User {
    id: number;
    email: string;
    role: Role;
    roles: Role[];
    companyId: number | null;
}

export interface Company {
    id: number;
    name: string;
    taxId: string | null;
    address: string | null;
    active: boolean;
    vatActive?: boolean;
}

export interface CompanyCreateRequest {
    name: string;
    taxId?: string | null;
    address?: string | null;
    active?: boolean;
    vatActive?: boolean;
}

export interface CompanyUpdateRequest {
    name?: string;
    taxId?: string | null;
    address?: string | null;
    active?: boolean;
    vatActive?: boolean;
}

export interface CompanyUserRow {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
}

export interface AdminUserCreateRequest {
    email: string;
    password: string;
    role: string;
    companyId: number | null;
    firstName?: string | null;
    lastName?: string | null;
}

export interface AdminUserUpdateRequest {
    email?: string;
    password?: string;
    role?: string;
    companyId?: number | null;
    firstName?: string | null;
    lastName?: string | null;
}

/* =========================================================
 *  KSIĘGOWOŚĆ: Kategorie / Kontrahenci / Dokumenty / Księga
 * ========================================================= */

export type DocumentType = "INCOME" | "COST" | string;
export type DocumentStatus = "BUFFER" | "BOOKED" | string;

export interface CategoryRow {
    id: number;
    name: string;
    type: DocumentType; // INCOME / COST
    companyId: number;  // backend zwraca companyId (po naszej poprawce)
}

export interface ContractorRow {
    id: number;
    name: string;
    taxId: string | null;
    address: string | null;
    companyId: number; // backend zwraca companyId (po naszej poprawce)
}

export interface DocumentCreateResponse {
    id: number;
}

export interface DocumentBookResponse {
    ledgerNumber: number;
}

/**
 * /api/ledger (GET) – zwracasz:
 * ledgerNumber, eventDate, description, type, netAmount, grossAmount
 */
export interface LedgerRow {
    ledgerNumber: number;
    eventDate: string; // "YYYY-MM-DD"
    description: string | null;
    type: DocumentType;
    netAmount: number;
    grossAmount: number;
}

/* =========================================================
 *  Parametry list / filtry (dla serwisów frontu)
 * ========================================================= */

export type SortDir = "asc" | "desc";

export interface DocumentListQuery {
    type?: DocumentType;
    status?: DocumentStatus;
    // jeśli potem dodasz filtry dat, tu je dopiszemy:
    // fromEventDate?: string;
    // toEventDate?: string;
}

export interface DocumentRow {
    id: number;
    type: DocumentType;
    issueDate: string;    // YYYY-MM-DD
    eventDate: string;    // YYYY-MM-DD
    description: string | null;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    status: DocumentStatus;          // BUFFER / BOOKED (czasem w UI masz "BUF" - ogarniamy normalize)
    ledgerNumber: number | null;
}

export type DocumentCreateRequest = {
    invoiceNumber: string;
    type: DocumentType;
    issueDate: string;
    eventDate: string;
    description: string | null;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    categoryId: number | null;
    contractorId: number | null;
};

export interface CategoryCreateRequest {
    name: string;
    type: DocumentType;
}
export interface CategoryUpdateRequest {
    name?: string;
    type?: DocumentType;
}

export interface ContractorCreateRequest {
    name: string;
    taxId?: string | null;
    address?: string | null;
}
export interface ContractorUpdateRequest {
    name?: string;
    taxId?: string | null;
    address?: string | null;
}
