import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/app_theme.dart';
import 'package:mobile/app/theme/app_tokens.dart';
import 'package:mobile/shared/models/status.dart';
import 'package:mobile/shared/widgets/status_badge.dart';

Widget _wrap(Widget child) {
  return MaterialApp(theme: AppTheme.light(), home: Scaffold(body: Center(child: child)));
}

void main() {
  group('StatusBadge', () {
    testWidgets('Normal shows a check icon and the "Normal" label', (tester) async {
      await tester.pumpWidget(_wrap(const StatusBadge(status: DeviceStatus.normal)));
      expect(find.text('Normal'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('every status pairs an icon with a text label (never color alone)', (tester) async {
      for (final status in DeviceStatus.values) {
        await tester.pumpWidget(_wrap(StatusBadge(status: status)));
        final icon = tester.widgetList<Icon>(find.byType(Icon));
        final text = tester.widgetList<Text>(find.byType(Text));
        expect(icon, isNotEmpty, reason: '$status must show an icon');
        expect(text, isNotEmpty, reason: '$status must show a text label');
      }
    });

    testWidgets('WATER_LOW uses the informative blue token, not negative red', (tester) async {
      await tester.pumpWidget(_wrap(const StatusBadge(status: DeviceStatus.waterLow)));
      expect(find.text('Air rendah'), findsOneWidget);

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppTokens.light.informativeSubtle);
      expect(decoration.color, isNot(AppTokens.light.negativeSubtle));
    });

    testWidgets('offline uses the neutral pasteboard treatment, not red', (tester) async {
      await tester.pumpWidget(
        _wrap(const StatusBadge(status: DeviceStatus.critical, isOffline: true)),
      );
      // Offline overrides the visual even if the last known status was
      // critical: offline must never read as a plant emergency.
      expect(find.text('Offline'), findsOneWidget);
      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppTokens.light.backgroundPasteboard);
    });

    testWidgets('exposes a Semantics label for screen readers', (tester) async {
      await tester.pumpWidget(_wrap(const StatusBadge(status: DeviceStatus.critical)));
      expect(find.bySemanticsLabel('Status: Kritis'), findsOneWidget);
    });
  });
}
