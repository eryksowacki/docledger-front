// ===========================================================
// Symfony
// ===========================================================
// import { apiFetch } from './api';
// import type { User } from './types';
//
// const USER_STORAGE_KEY = 'currentUser';
//
// export async function login(email: string, password: string): Promise<User> {
//     const data = await apiFetch<User>('/api/login', {
//         method: 'POST',
//         body: JSON.stringify({ email, password }),
//     });
//
//     localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
//     return data;
// }
//
// export function getCurrentUser(): User | null {
//     const raw = localStorage.getItem(USER_STORAGE_KEY);
//     if (!raw) return null;
//
//     try {
//         return JSON.parse(raw) as User;
//     } catch {
//         return null;
//     }
// }
//
// export function logout(): void {
//     localStorage.removeItem(USER_STORAGE_KEY);
// }
//
// export async function me(): Promise<User> {
//     return apiFetch<User>('/api/me', { method: 'GET' });
// }
//
// export async function logoutRequest(): Promise<void> {
//     await apiFetch('/api/logout', { method: 'POST' });
// }

// ===========================================================
// Laravel
// ===========================================================
// src/authService.ts
import { apiFetch } from './api';
import type { User } from './types';

const USER_STORAGE_KEY = 'currentUser';

/**
 * Sanctum SPA: musisz najpierw pobrać CSRF cookie,
 * dopiero potem robić POST/PUT/PATCH/DELETE.
 */
export async function csrfCookie(): Promise<void> {
    // endpoint jest poza /api
    await apiFetch('/sanctum/csrf-cookie', { method: 'GET' });
}

export async function login(email: string, password: string): Promise<User> {
    // 1) CSRF cookie
    await csrfCookie();

    // 2) login
    const data = await apiFetch<User>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
    return data;
}

export async function me(): Promise<User> {
    const data = await apiFetch<User>('/api/me', { method: 'GET' });
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

/**
 * Czyści lokalny stan (UI) bez wołania backendu.
 * Zwykle używaj logoutRequest() + logout() razem.
 */
export function logout(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Wylogowanie na backendzie (unieważnia sesję).
 * Dla pewności robi CSRF cookie (czasem wymagane przy POST).
 */
export async function logoutRequest(): Promise<void> {
    try {
        await csrfCookie();
        await apiFetch('/api/logout', { method: 'POST' });
    } finally {
        logout();
    }
}
