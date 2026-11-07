import { and, eq, isNull, gt } from "drizzle-orm";
import { uuidv7 } from "@smart-plant/shared";
import type { Db } from "../client.js";
import { users, sessions, authTokens } from "../schema/index.js";

export function createUsersRepository(db: Db) {
  return {
    create(input: { name: string; email: string; passwordHash: string }) {
      const now = Date.now();
      const row = {
        id: uuidv7(),
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        emailVerifiedAt: null as number | null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(users).values(row).run();
      return row;
    },

    findByEmail(email: string) {
      return db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .get();
    },

    findById(id: string) {
      return db.select().from(users).where(eq(users.id, id)).get();
    },

    markEmailVerified(id: string) {
      db.update(users).set({ emailVerifiedAt: Date.now(), updatedAt: Date.now() }).where(eq(users.id, id)).run();
    },

    updatePassword(id: string, passwordHash: string) {
      db.update(users).set({ passwordHash, updatedAt: Date.now() }).where(eq(users.id, id)).run();
    },

    deleteById(id: string) {
      db.delete(users).where(eq(users.id, id)).run();
    },

    // --- sessions (refresh tokens) ---

    createSession(input: { userId: string; refreshTokenHash: string; expiresAt: number }) {
      const row = {
        id: uuidv7(),
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null as number | null,
        createdAt: Date.now(),
      };
      db.insert(sessions).values(row).run();
      return row;
    },

    findActiveSessionByHash(refreshTokenHash: string) {
      return db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.refreshTokenHash, refreshTokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, Date.now()),
          ),
        )
        .get();
    },

    revokeSession(id: string) {
      db.update(sessions).set({ revokedAt: Date.now() }).where(eq(sessions.id, id)).run();
    },

    revokeAllSessionsForUser(userId: string) {
      db.update(sessions)
        .set({ revokedAt: Date.now() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
        .run();
    },

    // --- auth tokens (email verify / password reset) ---

    createAuthToken(input: {
      userId: string;
      type: "email_verify" | "password_reset";
      tokenHash: string;
      expiresAt: number;
    }) {
      const row = {
        id: uuidv7(),
        userId: input.userId,
        type: input.type,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        usedAt: null as number | null,
        createdAt: Date.now(),
      };
      db.insert(authTokens).values(row).run();
      return row;
    },

    findValidAuthToken(type: "email_verify" | "password_reset", tokenHash: string) {
      return db
        .select()
        .from(authTokens)
        .where(
          and(
            eq(authTokens.type, type),
            eq(authTokens.tokenHash, tokenHash),
            isNull(authTokens.usedAt),
            gt(authTokens.expiresAt, Date.now()),
          ),
        )
        .get();
    },

    consumeAuthToken(id: string) {
      db.update(authTokens).set({ usedAt: Date.now() }).where(eq(authTokens.id, id)).run();
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
