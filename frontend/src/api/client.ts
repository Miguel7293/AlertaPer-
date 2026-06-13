export const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

let accessToken: string | null = localStorage.getItem('seguro_at');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('seguro_at', token);
  else localStorage.removeItem('seguro_at');
}

export function getAccessToken() {
  return accessToken;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function raw(path: string, options: RequestInit, withAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (withAuth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // send the httpOnly refresh cookie on /auth/*
  });
}

async function tryRefresh(): Promise<boolean> {
  const res = await raw('/auth/refresh', { method: 'POST' }, false);
  if (!res.ok) return false;
  const data = await res.json();
  setAccessToken(data.access_token);
  return true;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  withAuth = true,
): Promise<T> {
  let res = await raw(path, options, withAuth);

  if (res.status === 401 && withAuth) {
    const ok = await tryRefresh();
    if (ok) res = await raw(path, options, withAuth);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Error ${res.status}`;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => apiFetch<T>(p, { method: 'GET' }),
  post: <T = any>(p: string, body?: any, withAuth = true) =>
    apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, withAuth),
  patch: <T = any>(p: string, body?: any) =>
    apiFetch<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};
