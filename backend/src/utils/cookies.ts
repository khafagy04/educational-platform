import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const REFRESH_COOKIE = 'refresh_token';

export const readCookie = (request: Request, name: string): string | undefined => {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const item of header.split(';')) {
    const [key, ...valueParts] = item.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return undefined;
};

export const setRefreshCookie = (response: Response, token: string): void => {
  response.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshCookie = (response: Response): void => {
  response.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
};
