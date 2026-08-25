import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { SmtpEmailSender } from './email.sender.js';

if (env.EMAIL_PROVIDER !== 'smtp') {
  throw new Error('Set EMAIL_PROVIDER=smtp before running the email smoke test.');
}

const required = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`${name} is required for the email smoke test.`);
  return value;
};

const sender = new SmtpEmailSender(
  required(env.SMTP_HOST, 'SMTP_HOST'),
  env.SMTP_PORT,
  env.SMTP_SECURE,
  required(env.SMTP_USER, 'SMTP_USER'),
  required(env.SMTP_PASSWORD, 'SMTP_PASSWORD'),
  required(env.EMAIL_FROM, 'EMAIL_FROM'),
  env.APP_URL,
);

await sender.verifyConnection();
await sender.sendVerification(
  required(env.EMAIL_TEST_RECIPIENT, 'EMAIL_TEST_RECIPIENT'),
  randomBytes(32).toString('base64url'),
);
console.log('SMTP connection and verification-email delivery accepted by the provider.');
