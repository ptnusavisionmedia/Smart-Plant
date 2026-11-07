import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'token_storage.dart';

/// Wraps [FlutterSecureStorage] for the handful of auth values the app
/// persists. Per Tech Spec §5: tokens live only in secure storage, never
/// in plain prefs, and are never logged.
class SecureStorage implements TokenStorage {
  SecureStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'sp.accessToken';
  static const _accessTokenExpiresAtKey = 'sp.accessTokenExpiresAt';
  static const _refreshTokenKey = 'sp.refreshToken';

  @override
  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  @override
  Future<String?> readAccessTokenExpiresAt() => _storage.read(key: _accessTokenExpiresAtKey);

  @override
  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  @override
  Future<void> saveSession({
    required String accessToken,
    required String accessTokenExpiresAt,
    String? refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _accessTokenExpiresAtKey, value: accessTokenExpiresAt);
    if (refreshToken != null) {
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
    }
  }

  @override
  Future<void> saveAccessToken({
    required String accessToken,
    required String accessTokenExpiresAt,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _accessTokenExpiresAtKey, value: accessTokenExpiresAt);
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _accessTokenExpiresAtKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  @override
  Future<bool> hasSession() async {
    final token = await readAccessToken();
    return token != null && token.isNotEmpty;
  }
}
