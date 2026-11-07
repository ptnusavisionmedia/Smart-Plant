import 'package:dio/dio.dart';

/// A normalized error surfaced by [ApiClient] calls, wrapping the API's
/// error response shape so UI code can match on `code` (e.g. `WATER_LOW`,
/// `EMERGENCY_STOP`, `DEVICE_OFFLINE`, `RATE_LIMITED`, `DEVICE_TIMEOUT`,
/// per Tech Spec §3/§4.5) instead of parsing status codes everywhere.
class ApiException implements Exception {
  ApiException({
    required this.statusCode,
    required this.code,
    required this.message,
    this.fieldErrors = const {},
  });

  final int? statusCode;
  final String code;
  final String message;
  final Map<String, String> fieldErrors;

  bool get isNetworkError => statusCode == null;
  bool get isUnauthorized => statusCode == 401;

  factory ApiException.fromDioException(DioException e) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return ApiException(
        statusCode: null,
        code: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      );
    }

    final response = e.response;
    final data = response?.data;
    String code = 'UNKNOWN_ERROR';
    String message = 'Terjadi kesalahan. Coba lagi.';
    final fieldErrors = <String, String>{};

    if (data is Map) {
      final map = data.cast<String, dynamic>();
      code = (map['code'] as String?) ?? code;
      message = (map['message'] as String?) ?? message;
      final errors = map['fieldErrors'];
      if (errors is Map) {
        for (final entry in errors.entries) {
          fieldErrors[entry.key.toString()] = entry.value.toString();
        }
      }
    }

    return ApiException(
      statusCode: response?.statusCode,
      code: code,
      message: message,
      fieldErrors: fieldErrors,
    );
  }

  @override
  String toString() => 'ApiException($statusCode, $code, $message)';
}
