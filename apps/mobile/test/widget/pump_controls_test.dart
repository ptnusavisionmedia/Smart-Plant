import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/app_theme.dart';
import 'package:mobile/features/watering/application/watering_providers.dart';
import 'package:mobile/features/watering/presentation/emergency_stop_button.dart';
import 'package:mobile/features/watering/presentation/watering_controls.dart';

import '../fakes/fake_watering_action_controller.dart';

Widget _wrap(Widget child, FakeWateringActionController fake) {
  return ProviderScope(
    overrides: [
      wateringActionControllerProvider.overrideWith((ref) => fake),
    ],
    child: MaterialApp(theme: AppTheme.light(), home: Scaffold(body: Center(child: child))),
  );
}

void main() {
  group('WateringButton', () {
    testWidgets('opens a duration sheet defaulting to 10s and confirms with that duration', (tester) async {
      final fake = FakeWateringActionController();
      await tester.pumpWidget(_wrap(
        const WateringButton(deviceId: 'dev_1', maxPumpSeconds: 60, disabled: false),
        fake,
      ));

      await tester.tap(find.byKey(const Key('watering_button')));
      await tester.pumpAndSettle();

      expect(find.text('10 detik'), findsWidgets);
      await tester.tap(find.byKey(const Key('watering_confirm_button')));
      await tester.pumpAndSettle();

      expect(fake.waterCallCount, 1);
      expect(fake.lastDurationSeconds, 10);
    });

    testWidgets('clamps the default duration to a smaller device max', (tester) async {
      final fake = FakeWateringActionController();
      await tester.pumpWidget(_wrap(
        const WateringButton(deviceId: 'dev_1', maxPumpSeconds: 5, disabled: false),
        fake,
      ));

      await tester.tap(find.byKey(const Key('watering_button')));
      await tester.pumpAndSettle();

      expect(find.text('Siram 5 detik'), findsOneWidget);
    });

    testWidgets('disabled state shows the reason and does not open the sheet', (tester) async {
      final fake = FakeWateringActionController();
      await tester.pumpWidget(_wrap(
        const WateringButton(
          deviceId: 'dev_1',
          maxPumpSeconds: 60,
          disabled: true,
          disabledReason: 'Perangkat offline',
        ),
        fake,
      ));

      expect(find.text('Perangkat offline'), findsOneWidget);
      await tester.tap(find.byKey(const Key('watering_button')));
      await tester.pumpAndSettle();
      expect(fake.waterCallCount, 0);
    });
  });

  group('EmergencyStopButton', () {
    testWidgets('a single tap stops the pump without any confirmation dialog', (tester) async {
      final fake = FakeWateringActionController();
      await tester.pumpWidget(_wrap(
        const EmergencyStopButton(deviceId: 'dev_1', isOffline: false),
        fake,
      ));

      await tester.tap(find.byKey(const Key('emergency_stop_button')));
      // A single pump (no pumpAndSettle before this point) already fires
      // the tap handler synchronously; settle to let the snackbar show.
      await tester.pumpAndSettle();

      expect(fake.stopCallCount, 1);
      // DESIGN.md: stopping is the safe action and must never be gated
      // behind a confirmation dialog.
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.byType(Dialog), findsNothing);
      expect(find.text('Pompa dihentikan'), findsOneWidget);
    });

    testWidgets('is disabled with a reason when the device is offline', (tester) async {
      final fake = FakeWateringActionController();
      await tester.pumpWidget(_wrap(
        const EmergencyStopButton(deviceId: 'dev_1', isOffline: true),
        fake,
      ));

      expect(find.text('Perangkat offline'), findsOneWidget);
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.onPressed, isNull);

      await tester.tap(find.byKey(const Key('emergency_stop_button')), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(fake.stopCallCount, 0);
    });
  });
}
