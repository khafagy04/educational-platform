import { logger } from '../../lib/logger.js';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export type EmailSender = {
  sendVerification(email: string, token: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
};

export class LocalEmailSender implements EmailSender {
  public async sendVerification(email: string, _token: string): Promise<void> {
    void _token;
    logger.info({ email }, 'local verification email accepted');
    await Promise.resolve();
  }

  public async sendPasswordReset(email: string, _token: string): Promise<void> {
    void _token;
    logger.info({ email }, 'local password-reset email accepted');
    await Promise.resolve();
  }
}

export class SmtpEmailSender implements EmailSender {
  private readonly transport: nodemailer.Transporter;

  public constructor(
    host: string,
    port: number,
    secure: boolean,
    user: string,
    password: string,
    private readonly from: string,
    private readonly appUrl: string,
  ) {
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });
  }

  public async sendVerification(email: string, token: string): Promise<void> {
    const link = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.transport.sendMail({
      from: this.from,
      to: email,
      subject: 'تأكيد بريدك الإلكتروني',
      text: `أهلاً بك في مِداد. أكّد بريدك من خلال الرابط التالي: ${link}`,
      html: `<div dir="rtl"><h1>أهلاً بك في مِداد</h1><p>أكّد بريدك الإلكتروني لبدء التعلّم.</p><p><a href="${link}">تأكيد البريد الإلكتروني</a></p><p>تنتهي صلاحية الرابط خلال 24 ساعة.</p></div>`,
    });
  }

  public async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.transport.sendMail({
      from: this.from,
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      text: `استخدم الرابط التالي لإعادة تعيين كلمة المرور: ${link}`,
      html: `<div dir="rtl"><h1>إعادة تعيين كلمة المرور</h1><p><a href="${link}">اختيار كلمة مرور جديدة</a></p><p>تنتهي صلاحية الرابط خلال ساعة. تجاهل الرسالة إن لم تطلبها.</p></div>`,
    });
  }

  public async verifyConnection(): Promise<void> {
    await this.transport.verify();
  }
}

const requireEmailVariable = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`${name} is required when EMAIL_PROVIDER=smtp.`);
  return value;
};

export const createEmailSender = (): EmailSender => {
  if (env.EMAIL_PROVIDER === 'local') return new LocalEmailSender();
  return new SmtpEmailSender(
    requireEmailVariable(env.SMTP_HOST, 'SMTP_HOST'),
    env.SMTP_PORT,
    env.SMTP_SECURE,
    requireEmailVariable(env.SMTP_USER, 'SMTP_USER'),
    requireEmailVariable(env.SMTP_PASSWORD, 'SMTP_PASSWORD'),
    requireEmailVariable(env.EMAIL_FROM, 'EMAIL_FROM'),
    env.APP_URL,
  );
};
