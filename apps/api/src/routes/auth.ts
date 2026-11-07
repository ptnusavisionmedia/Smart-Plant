import type { FastifyInstance, FastifyReply } from "fastify";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
} from "@smart-plant/shared";
import { Errors } from "../errors.js";
import { clientIp } from "../plugins/rate-limit.js";
import { userIdFromRequest } from "../plugins/auth.js";
import { loadConfig } from "../config.js";

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function setRefreshCookie(reply: FastifyReply, refreshToken: string, maxAgeSeconds: number) {
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: loadConfig().NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    app.rateLimiters.auth(clientIp(req));
    const body = RegisterRequestSchema.parse(req.body);
    const user = await app.services.auth.register(body);
    reply.code(201);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: new Date(user.createdAt).toISOString(),
    };
  });

  app.get("/auth/verify-email", async (req) => {
    const query = req.query as { token?: string };
    if (!query.token) throw Errors.badRequest("Token wajib diisi");
    app.services.auth.verifyEmail(query.token);
    return { ok: true };
  });

  app.post("/auth/login", async (req, reply) => {
    app.rateLimiters.auth(clientIp(req));
    const body = LoginRequestSchema.parse(req.body);
    const tokens = await app.services.auth.login({ ...body, ip: clientIp(req) });
    setRefreshCookie(reply, tokens.refreshToken, 30 * 24 * 60 * 60);
    return { accessToken: tokens.accessToken, accessTokenExpiresAt: tokens.accessTokenExpiresAt, refreshToken: tokens.refreshToken };
  });

  app.post("/auth/refresh", async (req, reply) => {
    app.rateLimiters.auth(clientIp(req));
    const cookies = req.cookies as Record<string, string | undefined>;
    const body = req.body as { refreshToken?: string } | undefined;
    const refreshToken = cookies[REFRESH_COOKIE_NAME] ?? body?.refreshToken;
    if (!refreshToken) throw Errors.unauthorized("Refresh token tidak ditemukan");

    const tokens = app.services.auth.refresh(refreshToken);
    setRefreshCookie(reply, tokens.refreshToken, 30 * 24 * 60 * 60);
    return { accessToken: tokens.accessToken, accessTokenExpiresAt: tokens.accessTokenExpiresAt, refreshToken: tokens.refreshToken };
  });

  app.post("/auth/logout", { preHandler: app.authenticate }, async (req, reply) => {
    const cookies = req.cookies as Record<string, string | undefined>;
    const body = req.body as { refreshToken?: string } | undefined;
    const refreshToken = cookies[REFRESH_COOKIE_NAME] ?? body?.refreshToken;
    if (refreshToken) app.services.auth.logout(refreshToken);
    clearRefreshCookie(reply);
    reply.code(204);
  });

  app.post("/auth/forgot-password", async (req) => {
    app.rateLimiters.auth(clientIp(req));
    const body = ForgotPasswordRequestSchema.parse(req.body);
    await app.services.auth.forgotPassword(body.email);
    return { ok: true };
  });

  app.post("/auth/reset-password", async (req) => {
    app.rateLimiters.auth(clientIp(req));
    const body = ResetPasswordRequestSchema.parse(req.body);
    await app.services.auth.resetPassword(body.token, body.newPassword);
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: app.authenticate }, async (req) => {
    const userId = userIdFromRequest(req);
    const user = app.repos.users.findById(userId);
    if (!user) throw Errors.notFound("Pengguna tidak ditemukan");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: new Date(user.createdAt).toISOString(),
    };
  });
}
