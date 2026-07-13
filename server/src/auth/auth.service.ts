import type { Request, Response } from "express";
import {
  authenticationService,
  clearRefreshCookie,
  organizationTypeForRegistrationExport,
} from "../modules/authentication";

export { clearRefreshCookie };

export const organizationTypeForRegistration = organizationTypeForRegistrationExport;

export const setupOwnerPassword = (body: { email: string; newPassword: string; username: string }) =>
  authenticationService.setupOwnerPassword(body);

export const registerUser = (
  body: Parameters<AuthenticationServiceRegister>[0],
  req: Request,
  res: Response,
) => authenticationService.register(body, req, res);

type AuthenticationServiceRegister = typeof authenticationService.register;

export const loginUser = (
  body: { email: string; password: string; rememberMe: boolean },
  req: Request,
  res: Response,
) => authenticationService.login(body, req, res);

export const refreshSession = (req: Request, res: Response) => authenticationService.refresh(req, res);

export const logoutSession = (req: Request, res: Response) => authenticationService.logout(req, res);

export const logoutAllSessions = (userId: string, res: Response) => authenticationService.logoutAll(userId, res);

export const requestPasswordReset = (emailInput: string) => authenticationService.requestPasswordReset(emailInput);

export const resetPassword = (body: { email: string; newPassword: string; token: string }) =>
  authenticationService.resetPassword(body);

export const verifyEmail = (body: { email: string; token: string }) => authenticationService.verifyEmail(body);

export const resendVerificationEmail = (emailInput: string) => authenticationService.resendVerification(emailInput);

export const changeOwnPassword = (userId: string, body: { currentPassword: string; newPassword: string }) =>
  authenticationService.changePassword(userId, body);

export const updateOwnEmail = (userId: string, body: { email: string; password: string }) =>
  authenticationService.updateEmail(userId, body);

export const listOwnLoginHistory = (userId: string) => authenticationService.listLoginHistory(userId);

export const issueAuthResponse = (
  input: Parameters<typeof authenticationService.issueAuthResponse>[0],
) => authenticationService.issueAuthResponse(input);

export const requestPhoneOtp = (body: { name?: string; phoneNumber: string; purpose: "LOGIN" | "REGISTER" }) =>
  authenticationService.requestPhoneOtp(body);

export const verifyPhoneOtp = (
  body: { otp: string; phoneNumber: string; rememberMe: boolean },
  req: Request,
  res: Response,
) => authenticationService.verifyPhoneOtp(body, req, res);

export const oauthLogin = (
  body: {
    email?: string;
    name?: string;
    provider: "GOOGLE" | "APPLE" | "MICROSOFT" | "FACEBOOK" | "LINKEDIN";
    providerUserId: string;
    rememberMe: boolean;
  },
  req: Request,
  res: Response,
) => authenticationService.oauthLogin(body, req, res);
