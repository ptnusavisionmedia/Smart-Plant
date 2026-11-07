import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app/app.dart';

/// Sentry DSN, overridable with `--dart-define=SENTRY_DSN=...` (Tech Spec
/// §5 Observability). Left empty by default since no Sentry project is
/// configured for this environment — Sentry is simply not initialized in
/// that case, same pattern as the Firebase push-notification stub.
const String _sentryDsn = String.fromEnvironment('SENTRY_DSN', defaultValue: '');

Future<void> main() async {
  if (_sentryDsn.isEmpty) {
    runApp(const ProviderScope(child: SmartPlantApp()));
    return;
  }

  await SentryFlutter.init(
    (options) {
      options.dsn = _sentryDsn;
      options.tracesSampleRate = 0.2;
    },
    appRunner: () => runApp(const ProviderScope(child: SmartPlantApp())),
  );
}
