import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";
import type { Repositories } from "@smart-plant/db";
import { ARGON2ID_OPTIONS, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, EMAIL_VERIFY_TOKEN_TTL_MS, PASSWORD_RESET_TOKEN_TTL_MS, LOGIN_LOCKOUT_MAX_ATTEMPTS, LOGIN_LOCKOUT_WINDOW_MS } from "@smart-plant/shared";
import { Errors } from "../errors.js";
import type { Mailer } from "./mailer.js";

function opaqueToken(): string {
  return randomBytes(32).toString("hex");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

interface LockoutEntry {
  attempts: number;
  windowStartedAt: number;
}

const lockouts = new Map<string, LockoutEntry>();

function lockoutKey(email: string, ip: string) {
  return `${email.toLowerCase()}:${ip}`;
}

function checkLockout(email: string, ip: string) {
  const entry = lockouts.get(lockoutKey(email, ip));
  if (!entry) return;
  if (Date.now() - entry.windowStartedAt > LOGIN_LOCKOUT_WINDOW_MS) return;
  if (entry.attempts >= LOGIN_LOCKOUT_MAX_ATTEMPTS) {
    throw Errors.tooManyRequests("Terlalu banyak percobaan login. Coba lagi dalam 15 menit.");
  }
}

function recordFailedAttempt(email: string, ip: string) {
  const key = lockoutKey(email, ip);
  const entry = lockouts.get(key);
  const now = Date.now();
  if (!entry || now - entry.windowStartedAt > LOGIN_LOCKOUT_WINDOW_MS) {
    lockouts.set(key, { attempts: 1, windowStartedAt: now });
  } else {
    entry.attempts += 1;
  }
}

function clearLockout(email: string, ip: string) {
  lockouts.delete(lockoutKey(email, ip));
}

export interface SignAccessToken {
  (payload: { sub: string }): string;
}

export function createAuthService(repos: Repositories, mailer: Mailer, signAccessToken: SignAccessToken, publicUrl: string) {
  return {
    async register(input: { name: string; email: string; password: string }) {
      const existing = repos.users.findByEmail(input.email);
      if (existing) throw Errors.conflict("EMAIL_TAKEN", "Email sudah terdaftar");

      const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id, ...ARGON2ID_OPTIONS });
      const user = repos.users.create({ name: input.name, email: input.email, passwordHash });

      const token = opaqueToken();
      repos.users.createAuthToken({
        userId: user.id,
        type: "email_verify",
        tokenHash: sha256(token),
        expiresAt: Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS,
      });
      mailer.sendVerifyEmail(user.email, `${publicUrl}/api/v1/auth/verify-email?token=${token}`);

      return user;
    },

    verifyEmail(token: string) {
      const row = repos.users.findValidAuthToken("email_verify", sha256(token));
      if (!row) throw Errors.badRequest("Token verifikasi tidak valid atau sudah kedaluwarsa");
      repos.users.consumeAuthToken(row.id);
      repos.users.markEmailVerified(row.userId);
    },

    async login(input: { email: string; password: string; ip: string }) {
      checkLockout(input.email, input.ip);

      const user = repos.users.findByEmail(input.email);
      if (!user) {
        recordFailedAttempt(input.email, input.ip);
        throw Errors.unauthorized("Email atau kata sandi salah");
      }

      const valid = await argon2.verify(user.passwordHash, input.password);
      if (!valid) {
        recordFailedAttempt(input.email, input.ip);
        throw Errors.unauthorized("Email atau kata sandi salah");
      }

      clearLockout(input.email, input.ip);
      return this.issueTokens(user.id);
    },

    issueTokens(userId: string) {
      const accessToken = signAccessToken({ sub: userId });
      const refreshToken = opaqueToken();
      repos.users.createSession({
        userId,
        refreshTokenHash: sha256(refreshToken),
        expiresAt: Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
      });
      return {
        accessToken,
        accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
        refreshToken,
      };
    },

    refresh(refreshToken: string) {
      const session = repos.users.findActiveSessionByHash(sha256(refreshToken));
      if (!session) throw Errors.unauthorized("Refresh token tidak valid atau sudah dicabut");
      repos.users.revokeSession(session.id); // rotate: old refresh token is single-use
      return this.issueTokens(session.userId);
    },

    logout(refreshToken: string) {
      const session = repos.users.findActiveSessionByHash(sha256(refreshToken));
      if (session) repos.users.revokeSession(session.id);
    },

    async forgotPassword(email: string) {
      const user = repos.users.findByEmail(email);
      if (!user) return; // do not reveal whether the email exists

      const token = opaqueToken();
      repos.users.createAuthToken({
        userId: user.id,
        type: "password_reset",
        tokenHash: sha256(token),
        expiresAt: Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
      });
      mailer.sendPasswordResetEmail(user.email, `${publicUrl.replace("3001", "3000")}/reset-password?token=${token}`);
    },

    async resetPassword(token: string, newPassword: string) {
      const row = repos.users.findValidAuthToken("password_reset", sha256(token));
      if (!row) throw Errors.badRequest("Token reset tidak valid atau sudah kedaluwarsa");

      const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id, ...ARGON2ID_OPTIONS });
      repos.users.updatePassword(row.userId, passwordHash);
      repos.users.consumeAuthToken(row.id);
      repos.users.revokeAllSessionsForUser(row.userId); // force re-login everywhere
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
