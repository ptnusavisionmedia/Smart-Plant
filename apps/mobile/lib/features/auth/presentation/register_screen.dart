import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_tokens.dart';
import '../application/auth_providers.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final success = await ref.read(authControllerProvider.notifier).register(
          _nameController.text.trim(),
          _emailController.text.trim(),
          _passwordController.text,
        );
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Akun dibuat. Periksa email untuk verifikasi, lalu masuk.')),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Daftar')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(tokens.spacingLg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (authState.errorMessage != null) ...[
                  Text(authState.errorMessage!, style: TextStyle(color: tokens.negativeContent)),
                  SizedBox(height: tokens.spacingLg),
                ],
                Text('Nama', style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)),
                SizedBox(height: tokens.spacingXs),
                TextFormField(
                  key: const Key('register_name_field'),
                  controller: _nameController,
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Nama minimal 2 karakter' : null,
                ),
                SizedBox(height: tokens.spacingLg),
                Text('Email', style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)),
                SizedBox(height: tokens.spacingXs),
                TextFormField(
                  key: const Key('register_email_field'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => (v == null || !v.contains('@')) ? 'Format email tidak valid' : null,
                ),
                SizedBox(height: tokens.spacingLg),
                Text('Kata sandi', style: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600)),
                SizedBox(height: tokens.spacingXs),
                TextFormField(
                  key: const Key('register_password_field'),
                  controller: _passwordController,
                  obscureText: true,
                  validator: (v) =>
                      (v == null || v.length < 8) ? 'Kata sandi minimal 8 karakter' : null,
                ),
                SizedBox(height: tokens.spacingXl),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    key: const Key('register_submit_button'),
                    onPressed: authState.isLoading ? null : _submit,
                    child: authState.isLoading
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Buat akun'),
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
