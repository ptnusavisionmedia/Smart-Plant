import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../errors.js";

export default fp(
  async function errorHandlerPlugin(app: FastifyInstance) {
    app.setErrorHandler((error: FastifyError | AppError | ZodError, req, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return;
      }

      if (error instanceof ZodError) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Data yang dikirim tidak valid",
          details: { issues: error.issues },
        });
        return;
      }

      if (error.validation) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Data yang dikirim tidak valid",
          details: { issues: error.validation },
        });
        return;
      }

      req.log.error({ err: error }, "unhandled error");
      reply.status(500).send({ code: "INTERNAL_ERROR", message: "Kesalahan internal server" });
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.status(404).send({ code: "NOT_FOUND", message: "Rute tidak ditemukan" });
    });
  },
  { name: "errorHandlerPlugin" },
);
