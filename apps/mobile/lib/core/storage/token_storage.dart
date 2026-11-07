/// Abstraction over where auth tokens are persisted. [SecureStorage] is the
/// real `flutter_secure_storage`-backed implementation used by the app;
/// tests use an in-memory fake so they never touch a platform channel.
abstract class TokenStorage {
  Future<String?> readAccessToken();
  Future<String?> readAccessTokenExpiresAt();
  Future<String?> readRefreshToken();

  Future<void> saveSession({
    required String accessToken,
    required String accessTokenExpiresAt,
    String? refreshToken,
  });

  Future<void> saveAccessToken({required String accessToken, required String accessTokenExpiresAt});

  Future<void> clear();

  Future<bool> hasSession();
}
