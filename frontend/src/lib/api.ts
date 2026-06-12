export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD
    ? 'https://api.staycoolhairlab.id/api'
    : '/api'); 

export class ApiClientError extends Error {
    status: number;
    code?: string;
    details?: unknown;

    constructor(status: number, message: string, code?: string, details?: unknown) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

type ApiFetchOptions = RequestInit & { auth?: boolean };

async function request<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem('token');

    if (options.auth !== false && token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
        const errorBody = typeof data === 'object' && data !== null ? data as { error?: string; code?: string; details?: unknown } : {};
        if (res.status === 401 || errorBody.code === 'SESSION_EXPIRED' || errorBody.code === 'TOKEN_REVOKED') {
            window.dispatchEvent(new CustomEvent('auth-expired', { detail: errorBody }));
        }
        throw new ApiClientError(res.status, errorBody.error || 'Request failed', errorBody.code, errorBody.details);
    }

    return data as T;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    return request<T>(path, { ...options, auth: true });
}

export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    return request<T>(path, { ...options, auth: false });
}

let fetchInterceptorInstalled = false;

function isApiRequest(input: RequestInfo | URL) {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return rawUrl.startsWith(API_BASE_URL) || rawUrl.startsWith('/api/');
}

export function installAuthFetchInterceptor() {
    if (fetchInterceptorInstalled) return;
    fetchInterceptorInstalled = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        const token = localStorage.getItem('token');

        if (token && isApiRequest(input) && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await originalFetch(input, { ...init, headers });

        if (isApiRequest(input) && response.status === 401) {
            response.clone().json()
                .then((body) => {
                    if (body?.code === 'SESSION_EXPIRED' || body?.code === 'TOKEN_REVOKED' || body?.code === 'INVALID_TOKEN') {
                        window.dispatchEvent(new CustomEvent('auth-expired', { detail: body }));
                    }
                })
                .catch(() => {
                    window.dispatchEvent(new CustomEvent('auth-expired'));
                });
        }

        return response;
    };
}
