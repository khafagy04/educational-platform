import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { database } from '../lib/database.js';
import { logger } from '../lib/logger.js';
export const securityHeaders: RequestHandler = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  if (env.NODE_ENV === 'production')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  if (env.NODE_ENV === 'production' && req.get('x-forwarded-proto') !== 'https') {
    res.status(426).json({ error: { code: 'HTTPS_REQUIRED', message: 'يلزم اتصال HTTPS آمن' } });
    return;
  }
  next();
};
const actionFor = (method: string, path: string, body: unknown) => {
  if (method === 'PATCH' && /^\/courses\/[0-9a-f-]+$/iu.test(path))
    return (body as { status?: string }).status ? 'COURSE_STATUS_CHANGED' : 'COURSE_UPDATED';
  if (method === 'POST' && /^\/admin\/attempts\/[0-9a-f-]+\/grade$/iu.test(path))
    return 'QUIZ_MANUALLY_GRADED';
  if (method === 'PUT' && path.startsWith('/admin/settings/')) return 'PLATFORM_SETTING_CHANGED';
  if (method === 'PATCH' && /^\/admin\/students\/[0-9a-f-]+\/status$/iu.test(path))
    return 'STUDENT_STATUS_CHANGED';
  return null;
};
export const auditSensitiveActions: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    const action = actionFor(req.method, req.path, req.body);
    if (!action || !req.user || res.statusCode < 200 || res.statusCode >= 300) return;
    const parts = req.path.split('/').filter(Boolean),
      entityId = parts.find((x) => /^[0-9a-f-]{36}$/iu.test(x)) ?? parts.at(-1);
    void database.auditLog
      .create({
        data: {
          actorId: req.user.id,
          action,
          entityType: action.startsWith('COURSE')
            ? 'Course'
            : action.startsWith('QUIZ')
              ? 'QuizAttempt'
              : action.startsWith('STUDENT')
                ? 'User'
                : 'PlatformSetting',
          entityId: entityId ?? null,
          metadata: {
            method: req.method,
            path: req.path,
            status: (req.body as { status?: string }).status ?? null,
          },
          ...(req.ip ? { ipAddress: req.ip } : {}),
          ...(req.get('user-agent')
            ? { userAgent: String(req.get('user-agent')).slice(0, 500) }
            : {}),
        },
      })
      .catch((error: unknown) => {
        logger.warn({ error, action }, 'Failed to write audit log');
      });
  });
  next();
};
