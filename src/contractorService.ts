import { apiFetch } from "./api";
import type { ContractorRow } from "./types";

export type ContractorCreateRequest = {
  name: string;
  taxId?: string | null;
  address?: string | null;
};

export type ContractorUpdateRequest = Partial<ContractorCreateRequest>;

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;

  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.rows)) return payload.rows;

  console.warn("Expected array from API, got:", payload);
  return [];
}

export async function listContractors(): Promise<ContractorRow[]> {
  const res = await apiFetch<any>("/api/contractors");
  return unwrapList<ContractorRow>(res);
}

export async function createContractor(
  payload: ContractorCreateRequest
): Promise<{ id: number }> {
  return apiFetch<{ id: number }>("/api/contractors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateContractor(
  id: number,
  payload: ContractorUpdateRequest
): Promise<{ id: number }> {
  return apiFetch<{ id: number }>(`/api/contractors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteContractor(id: number): Promise<void> {
  return apiFetch<void>(`/api/contractors/${id}`, { method: "DELETE" });
}
