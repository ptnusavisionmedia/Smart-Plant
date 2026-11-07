import '../../../core/api/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../shared/models/auth_models.dart';

/// Talks to `/api/v1/auth/*` (Tech Spec §3/§4.1) and owns writing the
/// resulting tokens to secure storage.
class AuthRepository {
  AuthRepository({required ApiClient apiClient, required TokenStorage secureStorage})
      : _api = apiClient,
        _storage = secureStorage;

  final ApiClient _api;
  final TokenStorage _storage;

  Future<UserProfile> register(RegisterRequest request) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/auth/register',
      data: request.toJson(),
      skipAuth: true,
    );
    return UserProfile.fromJson(response.data!);
  }

  Future<UserProfile> login(LoginRequest request) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      data: request.toJson(),
      skipAuth: true,
    );
    final data = response.data!;
    final tokens = AuthTokens.fromJson(data);
    final refreshToken = data['refreshToken'] as String?;
    await _storage.saveSession(
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt.toIso8601String(),
      refreshToken: refreshToken,
    );
    return await me();
  }

  Future<UserProfile> me() async {
    final response = await _api.get<Map<String, dynamic>>('/auth/me');
    return UserProfile.fromJson(response.data!);
  }

  Future<void> forgotPassword(ForgotPasswordRequest request) async {
    await _api.post('/auth/forgot-password', data: request.toJson(), skipAuth: true);
  }

  Future<void> resetPassword(ResetPasswordRequest request) async {
    await _api.post('/auth/reset-password', data: request.toJson(), skipAuth: true);
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } finally {
      await _storage.clear();
    }
  }

  Future<bool> hasSession() => _storage.hasSession();
}
