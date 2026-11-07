import type { FastifyBaseLogger } from "fastify";

/** Dev mailer per Tech Spec §4.1 step 4: "dev: link ditulis ke log" — never a real send in V1. */
export function createMailer(log: FastifyBaseLogger) {
  return {
    sendVerifyEmail(to: string, link: string) {
      log.info({ to, link }, "[mailer:dev] email verification link");
    },
    sendPasswordResetEmail(to: string, link: string) {
      log.info({ to, link }, "[mailer:dev] password reset link");
    },
  };
}

export type Mailer = ReturnType<typeof createMailer>;
