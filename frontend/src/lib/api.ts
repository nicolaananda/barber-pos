export const API_BASE_URL = import.meta.env.PROD
    ? 'https://api.staycoolhairlab.id/api'
    : '/api'; 

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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem('token');

    if (token && !headers.has('Authorization')) {
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
        throw new ApiClientError(res.status, errorBody.error || 'Request failed', errorBody.code, errorBody.details);
    }

    return data as T;
}
