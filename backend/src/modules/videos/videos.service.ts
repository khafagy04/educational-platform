import { Service } from '../../core/service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/application-error.js';
import { LessonType } from '../../generated/prisma/enums.js';
import type { VideoProvider } from '../../integrations/video-provider/video.provider.js';
import { env } from '../../config/env.js';
import type { VideosRepositoryPort } from './videos.repository.js';
import type { CreateVideoUploadInput } from './videos.validators.js';

export class VideosService extends Service<VideosRepositoryPort> {
  public constructor(
    repository: VideosRepositoryPort,
    private readonly provider: VideoProvider,
  ) {
    super(repository);
  }

  public async createUpload(lessonId: string, creatorId: string, input: CreateVideoUploadInput) {
    const lesson = await this.repository.findLesson(lessonId);
    if (!lesson) throw new NotFoundError('الدرس غير موجود');
    if (lesson.type !== LessonType.VIDEO) {
      throw new ConflictError('يمكن إرفاق فيديو بدروس الفيديو فقط');
    }

    const uploaded = await this.provider.uploadVideo({
      lessonId,
      creatorId,
      maxDurationSeconds: input.maxDurationSeconds,
    });
    try {
      await this.repository.replaceVideo(lessonId, {
        provider: uploaded.provider,
        providerVideoId: uploaded.providerVideoId,
        status: uploaded.status,
      });
    } catch (error) {
      await this.provider.deleteVideo(uploaded.providerVideoId).catch(() => undefined);
      throw error;
    }
    if (lesson.video && lesson.video.providerVideoId !== uploaded.providerVideoId) {
      await this.provider.deleteVideo(lesson.video.providerVideoId);
    }
    return {
      video: { status: uploaded.status },
      upload: { url: uploaded.uploadUrl, expiresAt: uploaded.uploadExpiresAt },
    };
  }

  public async playback(lessonId: string, userId: string) {
    const context = await this.repository.findPlaybackContext(lessonId);
    if (!context?.video) throw new NotFoundError('فيديو الدرس غير موجود');
    const now = new Date();
    if (!(await this.repository.hasActiveEnrollment(userId, context.courseId, now))) {
      throw new ForbiddenError('يلزم اشتراك نشط لمشاهدة هذا الفيديو');
    }
    const grant = await this.provider.getPlaybackToken(
      context.video.providerVideoId,
      env.VIDEO_PLAYBACK_TTL_SECONDS,
    );
    return { token: grant.token, url: grant.playbackUrl, expiresAt: grant.expiresAt };
  }

  public async delete(lessonId: string): Promise<void> {
    const lesson = await this.repository.findLesson(lessonId);
    if (!lesson) throw new NotFoundError('الدرس غير موجود');
    if (!lesson.video) return;
    await this.provider.deleteVideo(lesson.video.providerVideoId);
    await this.repository.deleteVideo(lessonId);
  }
}
