import { Repository } from '../../core/repository.js';
import {
  EnrollmentStatus,
  type LessonType,
  type Video,
  type VideoProvider,
  type VideoStatus,
} from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export type LessonVideoContext = {
  id: string;
  type: LessonType;
  video: Video | null;
};

export type PlaybackContext = {
  courseId: string;
  video: Video | null;
};

export type VideosRepositoryPort = {
  findLesson(id: string): Promise<LessonVideoContext | null>;
  findPlaybackContext(lessonId: string): Promise<PlaybackContext | null>;
  hasActiveEnrollment(userId: string, courseId: string, now: Date): Promise<boolean>;
  replaceVideo(
    lessonId: string,
    input: { provider: VideoProvider; providerVideoId: string; status: VideoStatus },
  ): Promise<Video>;
  deleteVideo(lessonId: string): Promise<Video | null>;
};

export class VideosRepository extends Repository<PrismaClient> implements VideosRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public findLesson(id: string): Promise<LessonVideoContext | null> {
    return this.client.lesson.findUnique({
      where: { id },
      select: { id: true, type: true, video: true },
    });
  }

  public async findPlaybackContext(lessonId: string): Promise<PlaybackContext | null> {
    const lesson = await this.client.lesson.findUnique({
      where: { id: lessonId },
      select: { module: { select: { courseId: true } }, video: true },
    });
    return lesson ? { courseId: lesson.module.courseId, video: lesson.video } : null;
  }

  public async hasActiveEnrollment(userId: string, courseId: string, now: Date): Promise<boolean> {
    return (
      (await this.client.enrollment.count({
        where: {
          userId,
          courseId,
          status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
          startsAt: { lte: now },
          expiresAt: { gt: now },
        },
      })) > 0
    );
  }

  public replaceVideo(
    lessonId: string,
    input: { provider: VideoProvider; providerVideoId: string; status: VideoStatus },
  ): Promise<Video> {
    return this.client.video.upsert({
      where: { lessonId },
      create: { lessonId, ...input },
      update: { ...input, durationSec: null, errorMessage: null },
    });
  }

  public async deleteVideo(lessonId: string): Promise<Video | null> {
    const current = await this.client.video.findUnique({ where: { lessonId } });
    if (!current) return null;
    await this.client.video.delete({ where: { lessonId } });
    return current;
  }
}
