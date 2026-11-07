import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Default API base URL. Overridable at build/run time with
/// `--dart-define=API_BASE_URL=https://...` (see README).
const String kDefaultApiBaseUrl = 'http://localhost:3001';

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: kDefaultApiBaseUrl,
);

/// Thin wrapper around [Dio] configured for `/api/v1`.
///
/// Attaches the access token to every request, and on a `401` refreshes
/// the token exactly once via `POST /api/v1/auth/refresh`, retries the
/// original request once, and signals [onSessionExpired] (which the app
/// router listens to in order to redirect to `/login`) if the refresh
/// itself fails.
class ApiClient {
  ApiClient({
    required TokenStorage secureStorage,
    String? baseUrl,
    Dio? dio,
  })  : _secureStorage = secureStorage,
        dio = dio ??
            Dio(BaseOptions(
              baseUrl: '${baseUrl ?? kApiBaseUrl}/api/v1',
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 15),
              contentType: 'application/json',
            )) {
    this.dio.interceptors.add(_buildAuthInterceptor());
  }

  final Dio dio;
  final TokenStorage _secureStorage;

  /// Called when a 401 cannot be resolved by a token refresh. The app
  /// should treat this as "log the user out and go to /login".
  void Function()? onSessionExpired;

  /// Guards against concurrent refresh attempts triggered by parallel
  /// requests that all hit 401 at once.
  Completer<bool>? _refreshing;

  InterceptorsWrapper _buildAuthInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (!options.extra.containsKey('skipAuth')) {
          final token = await _secureStorage.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final status = error.response?.statusCode;
        final alreadyRetried = error.requestOptions.extra['retriedAfterRefresh'] == true;
        final isAuthRequest = error.requestOptions.extra.containsKey('skipAuth');

        if (status == 401 && !alreadyRetried && !isAuthRequest) {
          final refreshed = await _refreshAccessToken();
          if (refreshed) {
            try {
              final retryOptions = error.requestOptions;
              retryOptions.extra['retriedAfterRefresh'] = true;
              final token = await _secureStorage.readAccessToken();
              if (token != null) {
                retryOptions.headers['Authorization'] = 'Bearer $token';
              }
              final response = await dio.fetch(retryOptions);
              return handler.resolve(response);
            } catch (_) {
              // fall through to error below
            }
          } else {
            await _secureStorage.clear();
            onSessionExpired?.call();
          }
        }
        handler.next(error);
      },
    );
  }

  Future<bool> _refreshAccessToken() async {
    if (_refreshing != null) {
      return _refreshing!.future;
    }
    final completer = Completer<bool>();
    _refreshing = completer;
    try {
      final refreshToken = await _secureStorage.readRefreshToken();
      final response = await dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: refreshToken != null ? {'refreshToken': refreshToken} : null,
        options: Options(extra: {'skipAuth': true}),
      );
      final data = response.data;
      if (data == null) {
        completer.complete(false);
        return false;
      }
      await _secureStorage.saveAccessToken(
        accessToken: data['accessToken'] as String,
        accessTokenExpiresAt: data['accessTokenExpiresAt'] as String,
      );
      completer.complete(true);
      return true;
    } catch (_) {
      completer.complete(false);
      return false;
    } finally {
      _refreshing = null;
    }
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await dio.get<T>(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Response<T>> post<T>(String path, {Object? data, bool skipAuth = false}) async {
    try {
      return await dio.post<T>(
        path,
        data: data,
        options: skipAuth ? Options(extra: {'skipAuth': true}) : null,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Response<T>> patch<T>(String path, {Object? data}) async {
    try {
      return await dio.patch<T>(path, data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Response<T>> delete<T>(String path) async {
    try {
      return await dio.delete<T>(path);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
