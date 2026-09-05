const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getApiBase(): string {
  return API_BASE;
}

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('tuaobet_token');
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      (typeof body.message === 'string' && body.message) ||
      (typeof body.code === 'string' && body.code) ||
      res.statusText;
    throw new ApiError(message, res.status, typeof body.code === 'string' ? body.code : undefined);
  }

  return body as T;
}
