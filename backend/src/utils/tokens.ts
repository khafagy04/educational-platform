import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { UserRole } from '../generated/prisma/enums.js';
import { UnauthorizedError } from '../errors/application-error.js';

type AccessPayload = {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: 'educational-platform-api';
  aud: 'educational-platform-web';
};

const encode = (value: string): string => Buffer.from(value).toString('base64url');
const decode = (value: string): unknown => JSON.parse(Buffer.from(value, 'base64url').toString());

export class TokenService {
  public constructor(
    private readonly accessSecret: string,
    private readonly refreshPepper: string,
    private readonly accessTtlSeconds: number,
  ) {}

  public createAccessToken(userId: string, role: UserRole): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = encode(
      JSON.stringify({
        sub: userId,
        role,
        iat: issuedAt,
        exp: issuedAt + this.accessTtlSeconds,
        iss: 'educational-platform-api',
        aud: 'educational-platform-web',
      } satisfies AccessPayload),
    );
    const signature = this.sign(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
  }

  public verifyAccessToken(token: string): Pick<AccessPayload, 'sub' | 'role'> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT structure.');
      const [header, payload, signature] = parts as [string, string, string];
      const decodedHeader = decode(header);
      if (
        !decodedHeader ||
        typeof decodedHeader !== 'object' ||
        (decodedHeader as { alg?: unknown }).alg !== 'HS256' ||
        (decodedHeader as { typ?: unknown }).typ !== 'JWT'
      ) {
        throw new Error('Invalid JWT header.');
      }
      const expected = this.sign(`${header}.${payload}`);
      const actualBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      if (
        actualBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(actualBuffer, expectedBuffer)
      ) {
        throw new Error('Invalid JWT signature.');
      }

      const parsed = decode(payload);
      if (!this.isAccessPayload(parsed) || parsed.exp <= Math.floor(Date.now() / 1000)) {
        throw new Error('Expired or invalid JWT claims.');
      }
      return { sub: parsed.sub, role: parsed.role };
    } catch {
      throw new UnauthorizedError('رمز الوصول غير صالح');
    }
  }

  public createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  public hashOpaqueToken(token: string): string {
    return createHash('sha256').update(`${token}.${this.refreshPepper}`).digest('hex');
  }

  private sign(value: string): string {
    return createHmac('sha256', this.accessSecret).update(value).digest('base64url');
  }

  private isAccessPayload(value: unknown): value is AccessPayload {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<AccessPayload>;
    return (
      typeof candidate.sub === 'string' &&
      candidate.role !== undefined &&
      Object.values(UserRole).includes(candidate.role) &&
      typeof candidate.iat === 'number' &&
      typeof candidate.exp === 'number' &&
      candidate.iss === 'educational-platform-api' &&
      candidate.aud === 'educational-platform-web'
    );
  }
}
