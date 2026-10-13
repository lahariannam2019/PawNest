import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword, hashToken, generateOpaqueToken } from '../../lib/crypto.js';
import { AppError, ConflictError, UnauthorizedError, ValidationError, NotFoundError } from '../../lib/errors.js';
import { mailProvider } from '../../integrations/mail/mail.js';
import {
  RegisterInput,
  LoginInput,
  Role,
  EmailTokenType,
  UserSummary,
  ErrorCode,
} from '@pawnest/shared';

const jwtSecret = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_at_least_64_bytes_long_random_entropy';

export class AuthService {
  async register(input: RegisterInput): Promise<UserSummary> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError(ErrorCode.CONFLICT, 'An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        phone: input.phone,
      },
    });

    // Create email verification token
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: EmailTokenType.VERIFY_EMAIL,
        tokenHash,
        expiresAt,
      },
    });

    await mailProvider.send({
      to: user.email,
      subject: 'Verify your PawNest account',
      text: `Welcome to PawNest, ${user.name}! Please verify your email using this token: ${rawToken}`,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role as Role,
      reduceMotion: user.reduceMotion,
      emailVerified: false,
    };
  }

  async login(
    input: LoginInput,
    userAgent?: string,
    ip?: string
  ): Promise<{
    user: UserSummary;
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    // Generic error to prevent account enumeration
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await verifyPassword(user.passwordHash, input.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Session & Refresh Token setup
    const familyId = generateOpaqueToken(16);
    const rawRefreshToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash,
        userAgent,
        ip,
        expiresAt: refreshExpiresAt,
      },
    });

    // 15-minute access JWT
    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        sid: session.id,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const csrfToken = generateOpaqueToken(16);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role as Role,
        reduceMotion: user.reduceMotion,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
      accessToken,
      refreshToken: rawRefreshToken,
      csrfToken,
    };
  }

  async refresh(
    rawRefreshToken: string,
    userAgent?: string,
    ip?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse detection: if this token was already rotated / replaced, revoke entire family!
    if (session.revokedAt || session.replacedById) {
      await prisma.session.updateMany({
        where: { familyId: session.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Security notice: Refresh token reuse detected. All sessions terminated.');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh session expired');
    }

    // Rotate token
    const newRawRefreshToken = generateOpaqueToken(32);
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newSession = await prisma.session.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: newTokenHash,
        userAgent,
        ip,
        expiresAt: newExpiresAt,
      },
    });

    // Mark old session as replaced
    await prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedById: newSession.id,
      },
    });

    const accessToken = jwt.sign(
      {
        sub: session.user.id,
        role: session.user.role,
        sid: newSession.id,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const csrfToken = generateOpaqueToken(16);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      csrfToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      await prisma.session.updateMany({
        where: { familyId: session.familyId },
        data: { revokedAt: new Date() },
      });
    }
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const emailToken = await prisma.emailToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!emailToken || emailToken.type !== EmailTokenType.VERIFY_EMAIL) {
      throw new ValidationError('Invalid verification token');
    }

    if (emailToken.usedAt || emailToken.expiresAt < new Date()) {
      throw new ValidationError('Verification token has expired or already been consumed');
    }

    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always succeed silently to prevent user enumeration
    if (!user) return;

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: EmailTokenType.RESET_PASSWORD,
        tokenHash,
        expiresAt,
      },
    });

    await mailProvider.send({
      to: user.email,
      subject: 'Reset your PawNest password',
      text: `You requested a password reset. Use this token to reset your password: ${rawToken}`,
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const emailToken = await prisma.emailToken.findUnique({
      where: { tokenHash },
    });

    if (!emailToken || emailToken.type !== EmailTokenType.RESET_PASSWORD) {
      throw new ValidationError('Invalid password reset token');
    }

    if (emailToken.usedAt || emailToken.expiresAt < new Date()) {
      throw new ValidationError('Password reset token has expired or already been consumed');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { passwordHash },
      }),
      // Revoke all active sessions upon password reset
      prisma.session.updateMany({
        where: { userId: emailToken.userId },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}

export const authService = new AuthService();
