import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { analyticsQuery, exportParams, exportQuery } from './analytics.validators.js';
export const createAnalyticsRouter = () => {
  const r = Router(),
    c = new AnalyticsController(new AnalyticsService(database)),
    staff = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  r.get('/admin/analytics/revenue', ...staff, validate({ query: analyticsQuery }), c.revenue);
  r.get('/admin/analytics/payments', ...staff, validate({ query: analyticsQuery }), c.payments);
  r.get('/admin/analytics/engagement', ...staff, validate({ query: analyticsQuery }), c.engagement);
  r.get(
    '/admin/analytics/:report/export',
    ...staff,
    validate({ params: exportParams, query: exportQuery }),
    c.export,
  );
  return r;
};
