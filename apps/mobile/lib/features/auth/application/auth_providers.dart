import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../shared/models/auth_models.dart';
import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    secureStorage: ref.watch(secureStorageProvider),
  );
});

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.user, this.errorMessage, this.isLoading = false});

  final AuthStatus status;
  final UserProfile? user;
  final String? errorMessage;
  final bool isLoading;

  static const initial = AuthState(status: AuthStatus.unknown);

  AuthState copyWith({
    AuthStatus? status,
    UserProfile? user,
    String? errorMessage,
    bool clearError = false,
    bool? isLoading,
  }) => AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
        isLoading: isLoading ?? this.isLoading,
      );
}

/// Drives both the login/register screens and the go_router redirect
/// guard (Tech Spec §4.1, T-43): unauthenticated users are sent to
/// `/login`, and a failed token refresh (wired in `ApiClient.onSessionExpired`
/// from `app.dart`) flips this back to `unauthenticated` from anywhere in
/// the app.
class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(AuthState.initial);

  final AuthRepository _repository;

  Future<void> checkSession() async {
    final hasSession = await _repository.hasSession();
    if (!hasSession) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }
    try {
      final user = await _repository.me();
      state = state.copyWith(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _repository.login(LoginRequest(email: email, password: password));
      state = state.copyWith(status: AuthStatus.authenticated, user: user, isLoading: false);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(isLoading: false, errorMessage: 'Gagal masuk. Coba lagi.');
      return false;
    }
  }

  Future<bool> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repository.register(RegisterRequest(name: name, email: email, password: password));
      state = state.copyWith(isLoading: false);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(isLoading: false, errorMessage: 'Gagal mendaftar. Coba lagi.');
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repository.forgotPassword(ForgotPasswordRequest(email: email));
      state = state.copyWith(isLoading: false);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } finally {
      state = state.copyWith(status: AuthStatus.unauthenticated, user: null);
    }
  }

  /// Called by `ApiClient.onSessionExpired` when a refresh fails; forces
  /// the router guard to redirect to `/login` without calling the logout
  /// endpoint again (the server already rejected us).
  void forceLogout() {
    state = state.copyWith(status: AuthStatus.unauthenticated, user: null);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});
