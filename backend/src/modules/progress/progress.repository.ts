import { Repository } from '../../core/repository.js';
import { ForbiddenError, NotFoundError } from '../../errors/application-error.js';
import { CertificateStatus, CourseStatus, EnrollmentStatus } from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { UpdateProgressInput } from './progress.validators.js';

export type ProgressUpdateResult = {
  progress: unknown;
  completionEvent?: {
    enrollmentId: string;
    userId: string;
    courseId: string;
  };
};

export type ProgressRepositoryPort = {
  updateProgress(
    userId: string,
    lessonId: string,
    input: UpdateProgressInput,
  ): Promise<ProgressUpdateResult>;
  getCourseProgress(userId: string, courseId: string): Promise<unknown>;
  getDashboard(userId: string): Promise<unknown>;
};

const entitledStatuses = [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED];

export class ProgressRepository extends Repository<PrismaClient> implements ProgressRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public updateProgress(
    userId: string,
    lessonId: string,
    input: UpdateProgressInput,
  ): Promise<ProgressUpdateResult> {
    return this.client.$transaction(
      async (transaction) => {
        const lesson = await transaction.lesson.findUnique({
          where: { id: lessonId },
          select: { id: true, module: { select: { courseId: true } } },
        });
        if (!lesson) throw new NotFoundError('الدرس غير موجود');
        const enrollment = await transaction.enrollment.findFirst({
          where: {
            userId,
            courseId: lesson.module.courseId,
            status: { in: entitledStatuses },
            startsAt: { lte: new Date() },
            expiresAt: { gt: new Date() },
          },
        });
        if (!enrollment) throw new ForbiddenError('يلزم اشتراك ساري لتسجيل التقدم');
        const previous = await transaction.lessonProgress.findUnique({
          where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
        });
        const priorPct = previous ? Number(previous.progressPct) : 0;
        const progressPct = Math.max(priorPct, input.progressPct);
        const watchedSeconds = Math.max(previous?.watchedSeconds ?? 0, input.watchedSeconds);
        const completed = (previous?.completed ?? false) || input.completed || progressPct === 100;
        const now = new Date();
        const progress = await transaction.lessonProgress.upsert({
          where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
          create: {
            enrollmentId: enrollment.id,
            lessonId,
            progressPct: new Prisma.Decimal(progressPct),
            lastPositionSec: input.lastPositionSec,
            watchedSeconds,
            completed,
            completedAt: completed ? now : null,
            lastViewedAt: now,
          },
          update: {
            progressPct: new Prisma.Decimal(progressPct),
            lastPositionSec: input.lastPositionSec,
            watchedSeconds,
            completed,
            ...(completed && !previous?.completed ? { completedAt: now } : {}),
            lastViewedAt: now,
          },
        });
        const watchedDelta = watchedSeconds - (previous?.watchedSeconds ?? 0);
        const newlyCompleted = completed && !previous?.completed;
        const activityDate = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        await transaction.learningActivity.upsert({
          where: { userId_activityDate: { userId, activityDate } },
          create: {
            userId,
            activityDate,
            watchedSeconds: watchedDelta,
            lessonsCompleted: newlyCompleted ? 1 : 0,
          },
          update: {
            watchedSeconds: { increment: watchedDelta },
            lessonsCompleted: { increment: newlyCompleted ? 1 : 0 },
          },
        });

        const [requiredTotal, requiredCompleted] = await Promise.all([
          transaction.lesson.count({
            where: { module: { courseId: enrollment.courseId }, isRequired: true },
          }),
          transaction.lessonProgress.count({
            where: {
              enrollmentId: enrollment.id,
              completed: true,
              lesson: { isRequired: true },
            },
          }),
        ]);
        const transition =
          requiredTotal > 0 && requiredCompleted === requiredTotal
            ? await transaction.enrollment.updateMany({
                where: { id: enrollment.id, status: EnrollmentStatus.ACTIVE },
                data: { status: EnrollmentStatus.COMPLETED, completedAt: now },
              })
            : { count: 0 };
        return {
          progress,
          ...(transition.count === 1
            ? {
                completionEvent: {
                  enrollmentId: enrollment.id,
                  userId,
                  courseId: enrollment.courseId,
                },
              }
            : {}),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  public async getCourseProgress(userId: string, courseId: string): Promise<unknown> {
    const enrollment = await this.client.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: { in: entitledStatuses },
        expiresAt: { gt: new Date() },
      },
      include: { progress: true },
    });
    if (!enrollment) throw new ForbiddenError('يلزم اشتراك ساري لعرض التقدم');
    const lessons = await this.client.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true, isRequired: true },
    });
    const byLesson = new Map(enrollment.progress.map((item) => [item.lessonId, item]));
    const total = lessons.reduce(
      (sum, lesson) => sum + Number(byLesson.get(lesson.id)?.progressPct ?? 0),
      0,
    );
    const required = lessons.filter(({ isRequired }) => isRequired);
    const requiredCompleted = required.filter(
      ({ id }) => byLesson.get(id)?.completed === true,
    ).length;
    return {
      enrollmentId: enrollment.id,
      status: enrollment.status,
      overallCompletionPct: lessons.length === 0 ? 0 : Number((total / lessons.length).toFixed(2)),
      requiredCompleted,
      requiredTotal: required.length,
      lessons: enrollment.progress,
    };
  }

  public async getDashboard(userId: string): Promise<unknown> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    weekStart.setUTCHours(0, 0, 0, 0);
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { gradeId: true },
    });
    if (!user) throw new NotFoundError('المستخدم غير موجود');
    const enrollments = await this.client.enrollment.findMany({
      where: { userId, status: { in: entitledStatuses }, expiresAt: { gt: now } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            gradeId: true,
            modules: { select: { lessons: { select: { id: true, isRequired: true } } } },
          },
        },
        progress: { orderBy: { lastViewedAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const enrolledIds = enrollments.map(({ courseId }) => courseId);
    const [activity, certificatesCount, recentViews, recommended] = await Promise.all([
      this.client.learningActivity.findMany({
        where: { userId, activityDate: { gte: weekStart } },
        orderBy: { activityDate: 'asc' },
      }),
      this.client.certificate.count({
        where: { userId, status: CertificateStatus.GENERATED },
      }),
      this.client.courseView.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true, slug: true } } },
        orderBy: { lastViewedAt: 'desc' },
        take: 6,
      }),
      this.client.course.findMany({
        where: {
          status: CourseStatus.PUBLISHED,
          id: { notIn: enrolledIds },
          ...(user.gradeId ? { gradeId: user.gradeId } : {}),
        },
        select: { id: true, title: true, slug: true, price: true, currency: true },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      }),
    ]);
    let completedRequired = 0;
    let totalRequired = 0;
    for (const enrollment of enrollments) {
      const requiredIds = enrollment.course.modules.flatMap(({ lessons }) =>
        lessons.filter(({ isRequired }) => isRequired).map(({ id }) => id),
      );
      totalRequired += requiredIds.length;
      const completedIds = new Set(
        enrollment.progress.filter(({ completed }) => completed).map(({ lessonId }) => lessonId),
      );
      completedRequired += requiredIds.filter((id) => completedIds.has(id)).length;
    }
    return {
      stats: {
        overallCompletionPct:
          totalRequired === 0 ? 0 : Number(((completedRequired / totalRequired) * 100).toFixed(2)),
        totalLearningHours: Number(
          (activity.reduce((sum, item) => sum + item.watchedSeconds, 0) / 3600).toFixed(2),
        ),
        certificatesCount,
        enrolledCoursesCount: enrollments.length,
      },
      weeklyActivity: activity,
      continueLearning: enrollments.slice(0, 6).map((enrollment) => ({
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          slug: enrollment.course.slug,
        },
        lastProgress: enrollment.progress[0] ?? null,
      })),
      recommended,
      recentlyViewed: recentViews,
    };
  }
}
