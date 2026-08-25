import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { EmailSender } from '../../integrations/email/email.sender.js';
import { database } from '../../lib/database.js';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const email = 'phase4-student@example.local';

class CapturingEmailSender implements EmailSender {
  public verificationToken?: string;
  public resetToken?: string;

  public async sendVerification(_email: string, token: string): Promise<void> {
    this.verificationToken = token;
    await Promise.resolve();
  }

  public async sendPasswordReset(_email: string, token: string): Promise<void> {
    this.resetToken = token;
    await Promise.resolve();
  }
}

const sender = new CapturingEmailSender();
const app = createApp({ auth: { emailSender: sender } });
let gradeId = '';
let accessToken = '';
let firstRefreshCookie = '';

describe.skipIf(!runDatabaseTests)('authentication lifecycle', () => {
  beforeAll(async () => {
    await database.user.deleteMany({ where: { email } });
    const grade = await database.grade.findFirstOrThrow({ orderBy: { sortOrder: 'asc' } });
    gradeId = grade.id;
  });

  afterAll(async () => {
    await database.user.deleteMany({ where: { email } });
    await database.$disconnect();
  });

  it('registers a student and requires email verification', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'طالبة اختبار',
        email,
        phone: '+201099999991',
        parentPhone: '+201099999992',
        gradeId,
        governorate: 'القاهرة',
        school: 'مدرسة الاختبار',
        password: 'InitialPass2026',
      })
      .expect(201);

    expect(sender.verificationToken).toBeTypeOf('string');
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'InitialPass2026' })
      .expect(401);
  });

  it('verifies, logs in, and accesses the protected profile', async () => {
    await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: sender.verificationToken })
      .expect(200);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .set('user-agent', 'phase-4-test')
      .send({ email, password: 'InitialPass2026' })
      .expect(200);
    const body = login.body as { data: { accessToken: string } };
    accessToken = body.data.accessToken;
    firstRefreshCookie = login.headers['set-cookie']?.[0] ?? '';

    await request(app)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(app)
      .get('/api/v1/auth/role-check')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(403);
    await request(app).get('/api/v1/auth/me').set('authorization', 'Bearer invalid').expect(401);
  });

  it('rotates refresh tokens and rejects replay', async () => {
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('cookie', firstRefreshCookie)
      .expect(200);
    const replacementCookie = refreshed.headers['set-cookie']?.[0] ?? '';
    expect(replacementCookie).not.toBe(firstRefreshCookie);

    await request(app).post('/api/v1/auth/refresh').set('cookie', firstRefreshCookie).expect(401);
    await request(app).post('/api/v1/auth/refresh').set('cookie', replacementCookie).expect(401);
  });

  it('resets the password generically and revokes sessions', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'missing@example.local' })
      .expect(200);
    await request(app).post('/api/v1/auth/forgot-password').send({ email }).expect(200);
    expect(sender.resetToken).toBeTypeOf('string');

    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: sender.resetToken, password: 'ReplacementPass2026' })
      .expect(200);
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'InitialPass2026' })
      .expect(401);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'ReplacementPass2026' })
      .expect(200);
    const cookie = login.headers['set-cookie']?.[0] ?? '';
    await request(app).post('/api/v1/auth/logout').set('cookie', cookie).expect(204);
    await request(app).post('/api/v1/auth/refresh').set('cookie', cookie).expect(401);
  });
});
