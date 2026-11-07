/// Mirrors `packages/shared/src/schemas/auth.ts`.
library;

class RegisterRequest {
  const RegisterRequest({required this.name, required this.email, required this.password});

  final String name;
  final String email;
  final String password;

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'password': password,
      };
}

class LoginRequest {
  const LoginRequest({required this.email, required this.password});

  final String email;
  final String password;

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
      };
}

class ForgotPasswordRequest {
  const ForgotPasswordRequest({required this.email});

  final String email;

  Map<String, dynamic> toJson() => {'email': email};
}

class ResetPasswordRequest {
  const ResetPasswordRequest({required this.token, required this.newPassword});

  final String token;
  final String newPassword;

  Map<String, dynamic> toJson() => {
        'token': token,
        'newPassword': newPassword,
      };
}

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.accessTokenExpiresAt});

  final String accessToken;
  final DateTime accessTokenExpiresAt;

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['accessToken'] as String,
        accessTokenExpiresAt: DateTime.parse(json['accessTokenExpiresAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'accessTokenExpiresAt': accessTokenExpiresAt.toIso8601String(),
      };
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.emailVerified,
    required this.createdAt,
  });

  final String id;
  final String name;
  final String email;
  final bool emailVerified;
  final DateTime createdAt;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        emailVerified: json['emailVerified'] as bool,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'emailVerified': emailVerified,
        'createdAt': createdAt.toIso8601String(),
      };
}
