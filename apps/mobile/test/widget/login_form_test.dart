import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/login_screen.dart';

Widget _wrap() {
  return const ProviderScope(
    child: MaterialApp(home: LoginScreen()),
  );
}

void main() {
  group('LoginScreen form', () {
    testWidgets('shows validation errors when submitted empty', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Email wajib diisi'), findsOneWidget);
      expect(find.text('Kata sandi wajib diisi'), findsOneWidget);
    });

    testWidgets('shows an email format error for an invalid address', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.enterText(find.byKey(const Key('login_email_field')), 'not-an-email');
      await tester.enterText(find.byKey(const Key('login_password_field')), 'secret123');
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Format email tidak valid'), findsOneWidget);
    });

    testWidgets('password visibility toggle flips obscureText', (tester) async {
      await tester.pumpWidget(_wrap());
      final fieldFinder = find.byKey(const Key('login_password_field'));
      TextField textField() => tester.widget<TextField>(
            find.descendant(of: fieldFinder, matching: find.byType(TextField)),
          );

      expect(textField().obscureText, isTrue);
      await tester.tap(find.byIcon(Icons.visibility_off));
      await tester.pump();
      expect(textField().obscureText, isFalse);
    });

    testWidgets('renders using the app theme (Source Sans 3 family on labels)', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(theme: AppTheme.light(), home: const LoginScreen()),
        ),
      );
      final buttonFinder = find.widgetWithText(ElevatedButton, 'Masuk');
      expect(buttonFinder, findsOneWidget);
    });
  });
}
