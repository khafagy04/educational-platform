import { NotFoundError } from '../../errors/application-error.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { AdminListQuery, AdminStudentQuery } from './admin.validators.js';
export class AdminService {
  constructor(private readonly db: PrismaClient) {}
  async overview() {
    const [students, courses, enrollments, pending, generated] = await this.db.$transaction([
      this.db.user.count({ where: { role: UserRole.STUDENT } }),
      this.db.course.count(),
      this.db.enrollment.count(),
      this.db.quizAttempt.count({ where: { status: 'PENDING_REVIEW' } }),
      this.db.certificate.count({ where: { status: 'GENERATED' } }),
    ]);
    return { students, courses, enrollments, pendingGrading: pending, certificates: generated };
  }
  async courses(q: AdminListQuery) {
    const where: Prisma.CourseWhereInput = {
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' } },
              { slug: { contains: q.search, mode: 'insensitive' } },
              { description: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(q.gradeId ? { gradeId: q.gradeId } : {}),
      ...(q.subjectId ? { subjectId: q.subjectId } : {}),
      ...(q.pricing === 'free'
        ? { price: 0 }
        : q.pricing === 'paid'
          ? { price: { gt: 0 } }
          : q.minPrice !== undefined || q.maxPrice !== undefined
            ? {
                price: {
                  ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
                  ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
                },
              }
            : {}),
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput[] =
      q.sort === 'price-asc'
        ? [{ price: 'asc' }]
        : q.sort === 'price-desc'
          ? [{ price: 'desc' }]
          : q.sort === 'popularity'
            ? [{ views: { _count: 'desc' } }]
            : [{ updatedAt: 'desc' }];
    const [items, total] = await this.db.$transaction([
      this.db.course.findMany({
        where,
        include: {
          grade: true,
          subject: true,
          _count: { select: { modules: true, enrollments: true } },
        },
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.course.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async students(q: AdminStudentQuery) {
    const where: Prisma.UserWhereInput = {
      role: UserRole.STUDENT,
      ...(q.gradeId ? { gradeId: q.gradeId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          grade: true,
          createdAt: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
  async student(id: string) {
    const item = await this.db.user.findFirst({
      where: { id, role: UserRole.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        parentPhone: true,
        governorate: true,
        school: true,
        status: true,
        grade: true,
        createdAt: true,
        enrollments: {
          include: { course: { select: { id: true, title: true, slug: true } }, progress: true },
          orderBy: { createdAt: 'desc' },
        },
        quizAttempts: {
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            createdAt: true,
            quiz: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        certificates: {
          select: {
            id: true,
            status: true,
            certificateNumber: true,
            course: { select: { title: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundError('الطالب غير موجود');
    return item;
  }
  settings() {
    return this.db.platformSetting.findMany({ orderBy: { key: 'asc' } });
  }
  faqs() {
    return this.db.fAQ.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  quizzes(courseId: string) {
    return this.db.quiz.findMany({
      where: { OR: [{ module: { courseId } }, { lesson: { module: { courseId } } }] },
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
  async setStudentStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    const student = await this.db.user.findFirst({
      where: { id, role: UserRole.STUDENT },
      select: { id: true },
    });
    if (!student) throw new NotFoundError('الطالب غير موجود');
    return this.db.user.update({
      where: { id },
      data: { status, suspendedAt: status === 'SUSPENDED' ? new Date() : null },
      select: { id: true, status: true, suspendedAt: true },
    });
  }
}
