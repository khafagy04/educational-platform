import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/application-error.js';
import {
  clearRefreshCookie,
  readCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from '../../utils/cookies.js';
import type { AuthService } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validators.js';

export class AuthController {
  public constructor(private readonly service: AuthService) {}

  public register = async (request: Request, response: Response): Promise<void> => {
    const user = await this.service.register(request.validated.body as RegisterInput);
    response.status(201).json({ data: { user, verificationRequired: true } });
  };

  public login = async (request: Request, response: Response): Promise<void> => {
    const session = await this.service.login(
      request.validated.body as LoginInput,
      this.context(request),
    );
    setRefreshCookie(response, session.refreshToken);
    response.json({ data: { accessToken: session.accessToken, user: session.user } });
  };

  public refresh = async (request: Request, response: Response): Promise<void> => {
    const current = readCookie(request, REFRESH_COOKIE);
    if (!current) throw new UnauthorizedError('رمز التحديث مطلوب');
    const session = await this.service.refresh(current, this.context(request));
    setRefreshCookie(response, session.refreshToken);
    response.json({ data: { accessToken: session.accessToken, user: session.user } });
  };

  public logout = async (request: Request, response: Response): Promise<void> => {
    const current = readCookie(request, REFRESH_COOKIE);
    if (current) await this.service.logout(current);
    clearRefreshCookie(response);
    response.status(204).send();
  };

  public verifyEmail = async (request: Request, response: Response): Promise<void> => {
    const { token } = request.validated.body as { token: string };
    await this.service.verifyEmail(token);
    response.json({ data: { verified: true } });
  };

  public forgotPassword = async (request: Request, response: Response): Promise<void> => {
    const { email } = request.validated.body as { email: string };
    await this.service.forgotPassword(email);
    response.json({ data: { accepted: true } });
  };

  public resetPassword = async (request: Request, response: Response): Promise<void> => {
    const { token, password } = request.validated.body as { token: string; password: string };
    await this.service.resetPassword(token, password);
    clearRefreshCookie(response);
    response.json({ data: { passwordReset: true } });
  };

  public me = async (request: Request, response: Response): Promise<void> => {
    if (!request.user) throw new UnauthorizedError();
    response.json({ data: { user: await this.service.getUser(request.user.id) } });
  };

  public roleCheck = (_request: Request, response: Response): void => {
    response.json({ data: { authorized: true } });
  };

  private context(request: Request) {
    const userAgent = request.get('user-agent');
    return {
      ...(userAgent ? { deviceInfo: userAgent.slice(0, 500) } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
    };
  }
}
