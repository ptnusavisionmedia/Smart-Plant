export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthorized: (message = "Tidak terautentikasi") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Tidak diizinkan") => new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Tidak ditemukan") => new AppError(404, "NOT_FOUND", message),
  conflict: (code: string, message: string) => new AppError(409, code, message),
  tooManyRequests: (message = "Terlalu banyak permintaan") => new AppError(429, "RATE_LIMITED", message),
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new AppError(400, "BAD_REQUEST", message, details),
  timeout: (message: string) => new AppError(504, "DEVICE_TIMEOUT", message),
  internal: (message = "Kesalahan internal server") => new AppError(500, "INTERNAL_ERROR", message),
};
