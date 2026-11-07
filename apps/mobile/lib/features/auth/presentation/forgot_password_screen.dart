import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_tokens.dart';
import '../application/auth_providers.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final success =
        await ref.read(authControllerProvider.notifier).forgotPassword(_emailController.text.trim());
    if (success) setState(() => _sent = true);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lupa kata sandi')),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(tokens.spacingLg),
          child: _sent
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.mark_email_read_outlined, color: tokens.positive, size: 32),
                    SizedBox(height: tokens.spacingMd),
                    Text(
                      'Jika email terdaftar, tautan reset kata sandi telah dikirim.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                )
              : Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Masukkan email akun Anda. Kami akan mengirim tautan reset kata sandi.',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      SizedBox(height: tokens.spacingLg),
                      TextFormField(
                        key: const Key('forgot_email_field'),
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(hintText: 'nama@email.com'),
                        validator: (v) => (v == null || !v.contains('@')) ? 'Format email tidak valid' : null,
                      ),
                      SizedBox(height: tokens.spacingXl),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: authState.isLoading ? null : _submit,
                          child: const Text('Kirim tautan reset'),
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
