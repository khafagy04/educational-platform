import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('application foundation', () => {
  const app = createApp({
    healthRepository: { checkDatabase: () => Promise.resolve() },
  });

  it('reports process liveness', async () => {
    const response = await request(app).get('/api/v1/health/live').expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: 'ok',
        service: 'educational-platform-api',
      },
    });
    expect(response.headers['x-request-id']).toBeTypeOf('string');
  });

  it('returns the Arabic foundation message', async () => {
    const response = await request(app).get('/api/v1').expect(200);

    expect(response.body).toEqual({ data: { message: 'مرحباً بك في منصة التعلّم' } });
  });

  it('checks readiness through the repository boundary', async () => {
    const response = await request(app).get('/api/v1/health/ready').expect(200);
    const body: unknown = response.body;

    expect(body).toMatchObject({ data: { status: 'ok' } });
  });

  it('returns field-level details for invalid input', async () => {
    const response = await request(app)
      .get('/api/v1/health/components/redis?verbose=maybe')
      .expect(400);
    const body: unknown = response.body;

    expect(body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'بيانات الطلب غير صالحة',
      },
    });
    expect(JSON.stringify(body)).toContain('params.component');
  });

  it('formats application errors consistently', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404);

    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'المورد المطلوب غير موجود' },
    });
  });
});
