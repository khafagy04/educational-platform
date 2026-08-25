import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { UserStatus, VerificationTokenType, type UserRole } from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { RegisterInput } from './auth.validators.js';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
};

export type StoredRefreshToken = {
  id: string;
  userId: string;
  familyId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  user: AuthUser;
};

export type AuthRepositoryPort = {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createStudent(input: RegisterInput, passwordHash: string): Promise<AuthUser>;
  storeVerificationToken(
    userId: string,
    tokenHash: string,
    type: VerificationTokenType,
    expiresAt: Date,
  ): Promise<void>;
  consumeVerificationToken(
    tokenHash: string,
    type: VerificationTokenType,
    passwordHash?: string,
  ): Promise<AuthUser | null>;
  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null>;
  rotateRefreshToken(
    currentId: string,
    input: {
      userId: string;
      tokenHash: string;
      familyId: string;
      deviceInfo?: string;
      ipAddress?: string;
      expiresAt: Date;
    },
  ): Promise<boolean>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
};

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
} satisfies Prisma.UserSelect;

export class AuthRepository extends Repository<PrismaClient> implements AuthRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public findUserByEmail(email: string): Promise<AuthUser | null> {
    return this.client.user.findUnique({ where: { email }, select: authUserSelect });
  }

  public findUserById(id: string): Promise<AuthUser | null> {
    return this.client.user.findUnique({ where: { id }, select: authUserSelect });
  }

  public async createStudent(input: RegisterInput, passwordHash: string): Promise<AuthUser> {
    try {
      const { password: _password, ...profile } = input;
      void _password;
      return await this.client.user.create({
        data: {
          ...profile,
          passwordHash,
          wallet: { create: {} },
          notificationPreference: { create: {} },
        },
        select: authUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل');
      }
      throw error;
    }
  }

  public async storeVerificationToken(
    userId: string,
    tokenHash: string,
    type: VerificationTokenType,
    expiresAt: Date,
  ): Promise<void> {
    await this.client.$transaction([
      this.client.verificationToken.deleteMany({ where: { userId, type, usedAt: null } }),
      this.client.verificationToken.create({ data: { userId, tokenHash, type, expiresAt } }),
    ]);
  }

  public async consumeVerificationToken(
    tokenHash: string,
    type: VerificationTokenType,
    passwordHash?: string,
  ): Promise<AuthUser | null> {
    return this.client.$transaction(async (transaction) => {
      const token = await transaction.verificationToken.findUnique({
        where: { tokenHash },
      });
      if (token?.type !== type || token.usedAt !== null || token.expiresAt <= new Date())
        return null;
      const now = new Date();
      const consumed = await transaction.verificationToken.updateMany({
        where: { id: token.id, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return null;
      let userUpdate: Prisma.UserUpdateInput;
      if (type === VerificationTokenType.EMAIL_VERIFICATION) {
        userUpdate = { emailVerifiedAt: now };
      } else {
        if (!passwordHash)
          throw new Error('Password hash is required for reset token consumption.');
        userUpdate = { passwordHash };
      }
      const user = await transaction.user.update({
        where: { id: token.userId },
        data: userUpdate,
        select: authUserSelect,
      });
      if (type === VerificationTokenType.PASSWORD_RESET) {
        await transaction.refreshToken.updateMany({
          where: { userId: token.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      return user;
    });
  }

  public async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.client.refreshToken.create({ data: input });
  }

  public findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.client.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        familyId: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: authUserSelect },
      },
    });
  }

  public async rotateRefreshToken(
    currentId: string,
    input: {
      userId: string;
      tokenHash: string;
      familyId: string;
      deviceInfo?: string;
      ipAddress?: string;
      expiresAt: Date;
    },
  ): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) return false;
      const replacement = await transaction.refreshToken.create({ data: input });
      await transaction.refreshToken.update({
        where: { id: currentId },
        data: { replacedById: replacement.id },
      });
      return true;
    });
  }

  public async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeFamily(familyId: string): Promise<void> {
    await this.client.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
