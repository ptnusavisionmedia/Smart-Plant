import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter")
  .max(128);

export const RegisterRequestSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email().max(254),
    password: PasswordSchema,
  })
  .strict();
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const ForgotPasswordRequestSchema = z
  .object({
    email: z.string().email().max(254),
  })
  .strict();
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(10).max(200),
    newPassword: PasswordSchema,
  })
  .strict();
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const AuthTokensSchema = z
  .object({
    accessToken: z.string(),
    accessTokenExpiresAt: z.string().datetime(),
  })
  .strict();
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const UserProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .strict();
export type UserProfile = z.infer<typeof UserProfileSchema>;
