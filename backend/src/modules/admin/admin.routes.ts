import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import {
  adminIdParams,
  adminListQuery,
  adminStudentQuery,
  studentStatusSchema,
} from './admin.validators.js';
export const createAdminRouter = () => {
  const r = Router(),
    c = new AdminController(new AdminService(database)),
    staff = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  r.get('/admin/overview', ...staff, c.overview);
  r.get('/admin/courses', ...staff, validate({ query: adminListQuery }), c.courses);
  r.get('/admin/students', ...staff, validate({ query: adminStudentQuery }), c.students);
  r.get('/admin/students/:id', ...staff, validate({ params: adminIdParams }), c.student);
  r.patch(
    '/admin/students/:id/status',
    ...staff,
    validate({ params: adminIdParams, body: studentStatusSchema }),
    c.setStudentStatus,
  );
  r.get('/admin/settings', ...staff, c.settings);
  r.get('/admin/faqs', ...staff, c.faqs);
  r.get('/admin/courses/:id/quizzes', ...staff, validate({ params: adminIdParams }), c.quizzes);
  return r;
};
