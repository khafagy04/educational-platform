import bcrypt from 'bcrypt';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../errors/application-error.js';
import { EnrollmentStatus, QuizStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type {
  ChangePasswordInput,
  NotificationPreferencesInput,
  StudentCourseQuery,
  UpdateProfileInput,
} from './student.validators.js';

const activeStatuses = [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED];

export class StudentService {
  public constructor(private readonly database: PrismaClient) {}

  public async courses(userId: string, query: StudentCourseQuery) {
    const now = new Date();
    const enrollments = await this.database.enrollment.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
        ...(query.tab === 'completed'
          ? { status: EnrollmentStatus.COMPLETED }
          : { status: { in: activeStatuses } }),
        ...(query.search
          ? { course: { title: { contains: query.search, mode: 'insensitive' } } }
          : {}),
        ...(query.tab === 'favorites' ? { course: { favorites: { some: { userId } } } } : {}),
      },
      include: {
        course: {
          include: {
            grade: true,
            subject: true,
            favorites: { where: { userId }, select: { id: true } },
          },
        },
        progress: { select: { progressPct: true, completed: true, lastViewedAt: true } },
      },
      orderBy: query.sort === 'title' ? { course: { title: 'asc' } } : { updatedAt: 'desc' },
    });
    const items = enrollments.map((enrollment) => {
      const progress = enrollment.progress.length
        ? enrollment.progress.reduce((sum, item) => sum + Number(item.progressPct), 0) /
          enrollment.progress.length
        : 0;
      return {
        id: enrollment.id,
        status: enrollment.status,
        expiresAt: enrollment.expiresAt,
        completedAt: enrollment.completedAt,
        progressPct: Number(progress.toFixed(2)),
        isFavorite: enrollment.course.favorites.length > 0,
        course: { ...enrollment.course, favorites: undefined },
      };
    });
    if (query.sort === 'progress') items.sort((a, b) => b.progressPct - a.progressPct);
    return { courses: items };
  }

  public async player(userId: string, courseId: string) {
    const enrollment = await this.database.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: { in: activeStatuses },
        startsAt: { lte: new Date() },
        expiresAt: { gt: new Date() },
      },
      include: {
        progress: true,
        course: {
          include: {
            grade: true,
            subject: true,
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                quizzes: {
                  where: { status: QuizStatus.PUBLISHED },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    timeLimitSec: true,
                    passingScore: true,
                    maxAttempts: true,
                  },
                },
                lessons: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    attachments: {
                      orderBy: { sortOrder: 'asc' },
                      select: { id: true, title: true, mimeType: true, sizeBytes: true },
                    },
                    quiz: {
                      where: { status: QuizStatus.PUBLISHED },
                      select: {
                        id: true,
                        title: true,
                        description: true,
                        timeLimitSec: true,
                        passingScore: true,
                        maxAttempts: true,
                      },
                    },
                    video: { select: { status: true, durationSec: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!enrollment) throw new ForbiddenError('يلزم اشتراك ساري لفتح المساق');
    return {
      enrollment,
      progressByLesson: Object.fromEntries(
        enrollment.progress.map((item) => [item.lessonId, item]),
      ),
    };
  }

  public async certificates(userId: string) {
    return {
      certificates: await this.database.certificate.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  public async profile(userId: string) {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        parentPhone: true,
        governorate: true,
        school: true,
        gradeId: true,
        grade: { select: { id: true, name: true } },
        notificationPreference: true,
      },
    });
    if (!user) throw new NotFoundError('المستخدم غير موجود');
    return user;
  }

  public async updateProfile(userId: string, input: UpdateProfileInput) {
    return this.database.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.parentPhone !== undefined ? { parentPhone: input.parentPhone } : {}),
        ...(input.governorate !== undefined ? { governorate: input.governorate } : {}),
        ...(input.school !== undefined ? { school: input.school } : {}),
        ...(input.gradeId !== undefined
          ? {
              grade:
                input.gradeId === null ? { disconnect: true } : { connect: { id: input.gradeId } },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        parentPhone: true,
        governorate: true,
        school: true,
        gradeId: true,
      },
    });
  }

  public async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash)))
      throw new UnauthorizedError('كلمة المرور الحالية غير صحيحة');
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await this.database.$transaction([
      this.database.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.database.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { changed: true };
  }

  public async preferences(userId: string) {
    return this.database.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  public async updatePreferences(userId: string, input: NotificationPreferencesInput) {
    return this.database.notificationPreference.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });
  }

  public async favorite(userId: string, courseId: string, enabled: boolean) {
    const enrollment = await this.database.enrollment.findFirst({
      where: { userId, courseId, status: { in: activeStatuses }, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!enrollment) throw new ForbiddenError('يمكن إضافة الدروس المشتركة فقط إلى المفضلة');
    if (enabled)
      await this.database.courseFavorite.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: {},
        create: { userId, courseId },
      });
    else await this.database.courseFavorite.deleteMany({ where: { userId, courseId } });
    return { favorite: enabled };
  }
}
