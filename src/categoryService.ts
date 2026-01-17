import { apiFetch } from "./api";
import type { CategoryRow, DocumentType } from "./types";

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

type CategoriesApiResponse =
  | CategoryRow[]
  | { data: CategoryRow[] }
  | { data: CategoryRow[]; meta?: any; links?: any };

function normalizeCategories(resp: CategoriesApiResponse): CategoryRow[] {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray((resp as any).data)) return (resp as any).data;
  return [];
}

export async function listCategories(
  query: { type?: DocumentType } = {}
): Promise<CategoryRow[]> {
  const q = buildQuery({ type: query.type });
  const resp = await apiFetch<CategoriesApiResponse>(`/api/categories${q}`, {
    method: "GET",
  });
  return normalizeCategories(resp);
}

export async function createCategory(payload: {
  name: string;
  type: "INCOME" | "COST";
}): Promise<{ id: number }> {
  return apiFetch<{ id: number }>(`/api/categories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(
  id: number,
  payload: { name?: string; type?: "INCOME" | "COST" }
): Promise<{ id: number }> {
  return apiFetch<{ id: number }>(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  await apiFetch<void>(`/api/categories/${id}`, { method: "DELETE" });
}
