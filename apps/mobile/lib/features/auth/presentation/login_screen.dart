import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../application/auth_providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final success = await ref
        .read(authControllerProvider.notifier)
        .login(_emailController.text.trim(), _passwordController.text);
    if (success && mounted) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(tokens.spacingLg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: tokens.spacingXxxl),
                Text('Smart Plant', style: Theme.of(context).textTheme.displayLarge),
                SizedBox(height: tokens.spacingSm),
                Text(
                  'Masuk untuk memantau dan menyiram tanaman Anda.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: tokens.neutralSubdued),
                ),
                SizedBox(height: tokens.spacingXxl),
                if (authState.errorMessage != null) ...[
                  Container(
                    key: const Key('login_error'),
                    padding: EdgeInsets.all(tokens.spacingMd),
                    decoration: BoxDecoration(
                      color: tokens.negativeSubtle,
                      borderRadius: BorderRadius.circular(tokens.radiusMd),
                      border: Border.all(color: tokens.negative),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: tokens.negativeContent, size: 18),
                        SizedBox(width: tokens.spacingSm),
                        Expanded(
                          child: Text(
                            authState.errorMessage!,
                            style: tokens.detailStyle.copyWith(color: tokens.negativeContent),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: tokens.spacingLg),
                ],
                Text('Email', style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)),
                SizedBox(height: tokens.spacingXs),
                TextFormField(
                  key: const Key('login_email_field'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(hintText: 'nama@email.com'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) return 'Email wajib diisi';
                    if (!value.contains('@')) return 'Format email tidak valid';
                    return null;
                  },
                ),
                SizedBox(height: tokens.spacingLg),
                Text('Kata sandi', style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)),
                SizedBox(height: tokens.spacingXs),
                TextFormField(
                  key: const Key('login_password_field'),
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  autofillHints: const [AutofillHints.password],
                  decoration: InputDecoration(
                    hintText: 'Kata sandi',
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                      tooltip: _obscurePassword ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi',
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Kata sandi wajib diisi';
                    return null;
                  },
                ),
                SizedBox(height: tokens.spacingSm),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => context.push('/forgot-password'),
                    child: const Text('Lupa kata sandi?'),
                  ),
                ),
                SizedBox(height: tokens.spacingMd),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    key: const Key('login_submit_button'),
                    onPressed: authState.isLoading ? null : _submit,
                    child: authState.isLoading
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Masuk'),
                  ),
                ),
                SizedBox(height: tokens.spacingLg),
                Center(
                  child: TextButton(
                    onPressed: () => context.push('/register'),
                    child: const Text('Belum punya akun? Daftar'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
