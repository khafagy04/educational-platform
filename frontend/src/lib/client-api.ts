'use client';

import { apiBase } from './api';

export async function clientApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = sessionStorage.getItem('accessToken');
  const send = () =>
    fetch(`${apiBase}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  let response = await send();
  if (response.status === 401) {
    const refreshed = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      const body = (await refreshed.json()) as { data: { accessToken: string } };
      token = body.data.accessToken;
      sessionStorage.setItem('accessToken', token);
      response = await send();
    }
  }
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? 'تعذّر تحميل البيانات');
  return body;
}
