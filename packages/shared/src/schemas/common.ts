import { z } from "zod";

/** Every Zod object schema in this package rejects unknown fields by default. */
export const strictObject = z.object;

export const ErrorResponseSchema = z
  .object({
    code: z.string().min(1).max(64),
    message: z.string().min(1).max(500),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const PaginationQuerySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const IdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

/** UUIDv7-shaped id used application-wide (see packages/shared/src/id.ts). */
export const IdSchema = z.string().min(1).max(64);
