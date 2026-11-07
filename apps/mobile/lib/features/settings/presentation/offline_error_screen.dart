import 'package:flutter/material.dart';

import '../../../shared/widgets/app_state_views.dart';

/// Shown by the router when the API is unreachable at startup (T-48):
/// states the cause and gives a recovery action, per DESIGN.md's error
/// state rules ("don't say only 'Terjadi kesalahan'").
class OfflineErrorScreen extends StatelessWidget {
  const OfflineErrorScreen({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ErrorStateView(
          message: 'Tidak dapat terhubung ke server Smart Plant. Periksa koneksi internet Anda.',
          retryLabel: 'Coba lagi',
          onRetry: onRetry,
        ),
      ),
    );
  }
}
