import 'package:mobile/core/storage/token_storage.dart';

/// In-memory [TokenStorage] for tests, so nothing touches the real
/// `flutter_secure_storage` platform channel (unavailable under
/// `flutter test`).
class InMemoryTokenStorage implements TokenStorage {
  String? _accessToken;
  String? _accessTokenExpiresAt;
  String? _refreshToken;

  @override
  Future<String?> readAccessToken() async => _accessToken;

  @override
  Future<String?> readAccessTokenExpiresAt() async => _accessTokenExpiresAt;

  @override
  Future<String?> readRefreshToken() async => _refreshToken;

  @override
  Future<void> saveSession({
    required String accessToken,
    required String accessTokenExpiresAt,
    String? refreshToken,
  }) async {
    _accessToken = accessToken;
    _accessTokenExpiresAt = accessTokenExpiresAt;
    if (refreshToken != null) _refreshToken = refreshToken;
  }

  @override
  Future<void> saveAccessToken({
    required String accessToken,
    required String accessTokenExpiresAt,
  }) async {
    _accessToken = accessToken;
    _accessTokenExpiresAt = accessTokenExpiresAt;
  }

  @override
  Future<void> clear() async {
    _accessToken = null;
    _accessTokenExpiresAt = null;
    _refreshToken = null;
  }

  @override
  Future<bool> hasSession() async => _accessToken != null && _accessToken!.isNotEmpty;
}
