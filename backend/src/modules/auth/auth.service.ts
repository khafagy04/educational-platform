import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Service } from '../../core/service.js';
import { ConflictError, UnauthorizedError } from '../../errors/application-error.js';
import { UserStatus, VerificationTokenType, type UserRole } from '../../generated/prisma/enums.js';
import type { EmailSender } from '../../integrations/email/email.sender.js';
import type { TokenService } from '../../utils/tokens.js';
import type { AuthRepositoryPort, AuthUser } from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.validators.js';

export type SessionContext = {
  deviceInfo?: string;
  ipAddress?: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export class AuthService extends Service<AuthRepositoryPort> {
  public constructor(
    repository: AuthRepositoryPort,
    private readonly emailSender: EmailSender,
    private readonly tokens: TokenService,
    private readonly refreshTtlDays: number,
  ) {
    super(repository);
  }

  public async register(input: RegisterInput): Promise<PublicUser> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.repository.createStudent(input, passwordHash);
    const token = this.tokens.createOpaqueToken();
    await this.repository.storeVerificationToken(
      user.id,
      this.tokens.hashOpaqueToken(token),
      VerificationTokenType.EMAIL_VERIFICATION,
      this.fromNow(24 * 60 * 60 * 1000),
    );
    await this.emailSender.sendVerification(user.email, token);
    return this.toPublicUser(user);
  }

  public async login(input: LoginInput, context: SessionContext): Promise<AuthSession> {
    const user = await this.repository.findUserByEmail(input.email);
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !valid) throw new UnauthorizedError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    this.assertCanLogin(user);
    return this.createSession(user, randomUUID(), context);
  }

  public async refresh(refreshToken: string, context: SessionContext): Promise<AuthSession> {
    const tokenHash = this.tokens.hashOpaqueToken(refreshToken);
    const stored = await this.repository.findRefreshToken(tokenHash);
    if (!stored) throw new UnauthorizedError('رمز التحديث غير صالح');
    if (stored.revokedAt) {
      await this.repository.revokeFamily(stored.familyId);
      throw new UnauthorizedError('تم اكتشاف إعادة استخدام رمز التحديث');
    }
    if (stored.expiresAt <= new Date()) throw new UnauthorizedError('انتهت صلاحية رمز التحديث');
    this.assertCanLogin(stored.user);

    const replacement = this.tokens.createOpaqueToken();
    const rotated = await this.repository.rotateRefreshToken(
      stored.id,
      this.refreshRecord(stored.userId, replacement, stored.familyId, context),
    );
    if (!rotated) {
      await this.repository.revokeFamily(stored.familyId);
      throw new UnauthorizedError('تم اكتشاف إعادة استخدام رمز التحديث');
    }
    return {
      accessToken: this.tokens.createAccessToken(stored.user.id, stored.user.role),
      refreshToken: replacement,
      user: this.toPublicUser(stored.user),
    };
  }

  public async logout(refreshToken: string): Promise<void> {
    await this.repository.revokeRefreshToken(this.tokens.hashOpaqueToken(refreshToken));
  }

  public async verifyEmail(token: string): Promise<void> {
    const user = await this.repository.consumeVerificationToken(
      this.tokens.hashOpaqueToken(token),
      VerificationTokenType.EMAIL_VERIFICATION,
    );
    if (!user) throw new ConflictError('رمز التحقق غير صالح أو مستخدم أو منتهي الصلاحية');
  }

  public async forgotPassword(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email);
    if (!user) return;
    const token = this.tokens.createOpaqueToken();
    await this.repository.storeVerificationToken(
      user.id,
      this.tokens.hashOpaqueToken(token),
      VerificationTokenType.PASSWORD_RESET,
      this.fromNow(60 * 60 * 1000),
    );
    await this.emailSender.sendPasswordReset(user.email, token);
  }

  public async resetPassword(token: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.repository.consumeVerificationToken(
      this.tokens.hashOpaqueToken(token),
      VerificationTokenType.PASSWORD_RESET,
      passwordHash,
    );
    if (!user) throw new ConflictError('رمز إعادة التعيين غير صالح أو مستخدم أو منتهي الصلاحية');
  }

  public async getUser(userId: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    return this.toPublicUser(user);
  }

  private async createSession(
    user: AuthUser,
    familyId: string,
    context: SessionContext,
  ): Promise<AuthSession> {
    const refreshToken = this.tokens.createOpaqueToken();
    await this.repository.createRefreshToken(
      this.refreshRecord(user.id, refreshToken, familyId, context),
    );
    return {
      accessToken: this.tokens.createAccessToken(user.id, user.role),
      refreshToken,
      user: this.toPublicUser(user),
    };
  }

  private refreshRecord(userId: string, token: string, familyId: string, context: SessionContext) {
    return {
      userId,
      tokenHash: this.tokens.hashOpaqueToken(token),
      familyId,
      ...(context.deviceInfo ? { deviceInfo: context.deviceInfo } : {}),
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
      expiresAt: this.fromNow(this.refreshTtlDays * 24 * 60 * 60 * 1000),
    };
  }

  private assertCanLogin(user: AuthUser): void {
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedError('الحساب موقوف');
    if (!user.emailVerifiedAt) throw new UnauthorizedError('يجب تأكيد البريد الإلكتروني أولاً');
  }

  private toPublicUser(user: AuthUser): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  private fromNow(milliseconds: number): Date {
    return new Date(Date.now() + milliseconds);
  }
}
