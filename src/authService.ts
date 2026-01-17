import { apiFetch } from "./api";
import type { User } from "./types";

const USER_STORAGE_KEY = "currentUser";

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<User>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
  return data;
}

export async function me(): Promise<User> {
  const data = await apiFetch<User>("/api/me", { method: "GET" });
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiFetch("/api/logout", { method: "POST" });
  } finally {
    logout();
  }
}
