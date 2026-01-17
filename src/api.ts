// src/api.ts
const API_BASE_URL = "";
const API_PREFIX = "";

function getCookie(name: string): string | null {
    const m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[2]) : null;
}

/**
 * Sanctum SPA: dociąga CSRF cookie (XSRF-TOKEN) jeśli go nie ma.
 * To jest wymagane dla stateful POST/PATCH/DELETE (inaczej 419).
 */
async function ensureCsrfCookie(): Promise<void> {
    if (getCookie("XSRF-TOKEN")) return;

    await fetch(`${API_BASE_URL}/api/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
        },
    });
}

function isWriteMethod(method?: string): boolean {
    const m = (method ?? "GET").toUpperCase();
    return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

function looksLikeJson(contentType: string | null): boolean {
    return !!contentType && contentType.toLowerCase().includes("application/json");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();

    // Dla write requestów zapewnij CSRF cookie (Sanctum SPA)
    if (isWriteMethod(method)) {
        await ensureCsrfCookie();
    }

    const xsrf = getCookie("XSRF-TOKEN");

    // Pozwól nadpisać headers w options, ale daj sensowne defaulty
    const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    };

    // Ustaw Content-Type tylko jeśli caller go nie podał
    const callerHeaders = (options.headers ?? {}) as Record<string, string>;
    const hasContentType =
        Object.keys(callerHeaders).some((k) => k.toLowerCase() === "content-type");

    if (!hasContentType) {
        headers["Content-Type"] = "application/json";
    }

    // CSRF header dla Sanctum (tylko jeśli cookie istnieje)
    if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {}),
        },
    });

    // 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    // Błędy: spróbuj wyciągnąć sensowną treść
    if (!response.ok) {
        const ct = response.headers.get("content-type");
        const raw = await response.text().catch(() => "");

        if (looksLikeJson(ct) && raw) {
            try {
                const j = JSON.parse(raw);
                // typowy Laravel: { message, errors }
                const msg = j?.message ? String(j.message) : raw;
                throw new Error(`API error ${response.status}: ${msg}`);
            } catch {
                // JSON parsowanie nie wyszło -> leć raw
            }
        }

        throw new Error(`API error ${response.status}: ${raw}`);
    }

    // Sukces: jeśli body puste, zwróć undefined
    const text = await response.text().catch(() => "");
    if (!text) {
        return undefined as T;
    }

    // Jeśli serwer odda JSON -> parsuj, inaczej zwróć tekst (rzadkie, ale bywa)
    const ct = response.headers.get("content-type");
    if (looksLikeJson(ct)) {
        return JSON.parse(text) as T;
    }

    // fallback: zwróć tekst jako any (np. gdyby kiedyś endpoint zwrócił plain text)
    return text as any as T;
}

export async function apiFetchBlob(
    path: string,
    options: RequestInit = {}
): Promise<{ blob: Blob; filename?: string }> {
    const method = (options.method ?? "GET").toUpperCase();

    if (isWriteMethod(method)) {
        await ensureCsrfCookie();
    }

    const xsrf = getCookie("XSRF-TOKEN");

    const headers: Record<string, string> = {
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
    };

    const callerHeaders = (options.headers ?? {}) as Record<string, string>;
    const hasContentType = Object.keys(callerHeaders).some((k) => k.toLowerCase() === "content-type");
    if (!hasContentType && options.body) {
        headers["Content-Type"] = "application/json";
    }

    if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;

    const res = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {}),
        },
    });

    // Jeżeli backend zwróci JSON (np. błąd), wyciągnij treść i pokaż ją zamiast "pobierz blob"
    const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${raw}`);
    }
    if (ct.includes("application/json")) {
        const raw = await res.text().catch(() => "");
        throw new Error(`API error (expected file, got JSON): ${raw}`);
    }

    // filename z Content-Disposition (obsługa filename i filename*)
    const cd = res.headers.get("content-disposition") ?? "";
    const filename =
        cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
            ? decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/i)![1])
            : cd.match(/filename="([^"]+)"/i)?.[1];

    return { blob: await res.blob(), filename: filename || undefined };
}
