import { randomBytes, randomUUID } from 'node:crypto';
import { ServiceUnavailableError } from '../../errors/application-error.js';
import { VideoProvider as VideoProviderName, VideoStatus } from '../../generated/prisma/enums.js';
import { allowedOrigins, env } from '../../config/env.js';

export type VideoUploadInput = {
  creatorId: string;
  lessonId: string;
  maxDurationSeconds: number;
};

export type VideoUploadResult = {
  provider: VideoProviderName;
  providerVideoId: string;
  status: VideoStatus;
  uploadUrl: string;
  uploadExpiresAt: Date;
};

export type PlaybackGrant = {
  token: string;
  playbackUrl: string;
  expiresAt: Date;
};

export type VideoProvider = {
  uploadVideo(input: VideoUploadInput): Promise<VideoUploadResult>;
  getPlaybackToken(providerVideoId: string, ttlSeconds: number): Promise<PlaybackGrant>;
  deleteVideo(providerVideoId: string): Promise<void>;
};

export class LocalVideoProvider implements VideoProvider {
  public async uploadVideo(_input: VideoUploadInput): Promise<VideoUploadResult> {
    void _input;
    const providerVideoId = `local-${randomUUID()}`;
    const uploadExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await Promise.resolve();
    return {
      provider: VideoProviderName.CLOUDFLARE_STREAM,
      providerVideoId,
      status: VideoStatus.READY,
      uploadUrl: `http://localhost.invalid/video-upload/${randomBytes(32).toString('base64url')}`,
      uploadExpiresAt,
    };
  }

  public async getPlaybackToken(
    _providerVideoId: string,
    ttlSeconds: number,
  ): Promise<PlaybackGrant> {
    void _providerVideoId;
    const token = randomBytes(32).toString('base64url');
    await Promise.resolve();
    return {
      token,
      playbackUrl: `http://localhost:3000/video/local/${token}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  public async deleteVideo(_providerVideoId: string): Promise<void> {
    void _providerVideoId;
    await Promise.resolve();
  }
}

type CloudflareEnvelope<T> = {
  success: boolean;
  result?: T;
};

export class CloudflareStreamProvider implements VideoProvider {
  public constructor(
    private readonly accountId: string,
    private readonly apiToken: string,
    private readonly customerCode: string,
    private readonly origins: string[],
  ) {}

  public async uploadVideo(input: VideoUploadInput): Promise<VideoUploadResult> {
    const uploadExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const result = await this.request<{ uid: string; uploadURL: string }>('direct_upload', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Upload-Creator': input.creatorId,
      },
      body: JSON.stringify({
        maxDurationSeconds: input.maxDurationSeconds,
        allowedOrigins: this.origins,
        creator: input.creatorId,
        expiry: uploadExpiresAt.toISOString(),
        requireSignedURLs: true,
        meta: { lessonId: input.lessonId },
      }),
    });
    return {
      provider: VideoProviderName.CLOUDFLARE_STREAM,
      providerVideoId: result.uid,
      status: VideoStatus.UPLOADING,
      uploadUrl: result.uploadURL,
      uploadExpiresAt,
    };
  }

  public async getPlaybackToken(
    providerVideoId: string,
    ttlSeconds: number,
  ): Promise<PlaybackGrant> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const result = await this.request<{ token: string }>(
      `${encodeURIComponent(providerVideoId)}/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exp: Math.floor(expiresAt.getTime() / 1000) }),
      },
    );
    return {
      token: result.token,
      playbackUrl: `https://customer-${this.customerCode}.cloudflarestream.com/${result.token}/iframe`,
      expiresAt,
    };
  }

  public async deleteVideo(providerVideoId: string): Promise<void> {
    await this.request<unknown>(encodeURIComponent(providerVideoId), { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    try {
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${this.apiToken}`);
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/stream/${path}`,
        {
          ...init,
          headers,
          signal: AbortSignal.timeout(15_000),
        },
      );
      const body = (await response.json()) as CloudflareEnvelope<T>;
      if (!response.ok || !body.success || body.result === undefined)
        throw new Error('Provider error');
      return body.result;
    } catch {
      throw new ServiceUnavailableError('خدمة الفيديو غير متاحة مؤقتاً');
    }
  }
}

const playbackOrigins = (): string[] =>
  allowedOrigins.map((origin) => {
    const value = new URL(origin);
    return value.host;
  });

export const createVideoProvider = (): VideoProvider => {
  if (env.VIDEO_PROVIDER === 'local') return new LocalVideoProvider();
  if (!env.VIDEO_PROVIDER_ACCOUNT_ID || !env.VIDEO_PROVIDER_API_TOKEN || !env.VIDEO_CUSTOMER_CODE) {
    throw new Error('Cloudflare Stream configuration is incomplete.');
  }
  return new CloudflareStreamProvider(
    env.VIDEO_PROVIDER_ACCOUNT_ID,
    env.VIDEO_PROVIDER_API_TOKEN,
    env.VIDEO_CUSTOMER_CODE,
    playbackOrigins(),
  );
};
