import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/app_theme.dart';
import 'package:mobile/shared/models/status.dart';
import 'package:mobile/shared/widgets/moisture_ring.dart';
import 'package:mobile/shared/widgets/status_badge.dart';

Widget _wrap(Widget child, {double textScale = 1.0}) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Builder(
      builder: (context) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
          child: Scaffold(body: Center(child: child)),
        );
      },
    ),
  );
}

void main() {
  group('MoistureRing', () {
    testWidgets('exposes the exact DESIGN.md semantics label for a normal reading', (tester) async {
      await tester.pumpWidget(_wrap(
        const MoistureRing(value: 42, status: DeviceStatus.normal),
      ));
      expect(
        find.bySemanticsLabel('Kelembapan tanah 42 persen, status Normal'),
        findsOneWidget,
      );
    });

    testWidgets('never fabricates a reading: null value shows a dash, not 0%', (tester) async {
      await tester.pumpWidget(_wrap(
        const MoistureRing(value: null, status: DeviceStatus.critical),
      ));
      expect(find.text('—'), findsOneWidget);
      expect(find.text('0%'), findsNothing);
      expect(
        find.bySemanticsLabel('Kelembapan tanah tidak tersedia, status Kritis'),
        findsOneWidget,
      );
    });

    testWidgets('pairs the ring with the numeric value and status label, never alone', (tester) async {
      await tester.pumpWidget(_wrap(
        const MoistureRing(value: 65, status: DeviceStatus.warning, showStatusLabel: true),
      ));
      // The percentage is painted via RichText (not a plain Text), so it
      // must be looked up with findRichText; the status label below the
      // ring is a plain Text.
      expect(find.textContaining('65', findRichText: true), findsOneWidget);
      expect(find.text('Peringatan'), findsOneWidget);
    });

    testWidgets('renders at 72dp on cards and 120dp on the detail screen', (tester) async {
      await tester.pumpWidget(_wrap(const MoistureRing(value: 50, status: DeviceStatus.normal, size: 72)));
      expect(tester.getSize(find.byType(MoistureRing)).width, 72);

      await tester.pumpWidget(_wrap(const MoistureRing(value: 50, status: DeviceStatus.normal, size: 120)));
      expect(tester.getSize(find.byType(MoistureRing)).width, 120);
    });
  });

  group('Largest text scale', () {
    testWidgets('status badge label is not truncated at the largest system text scale', (tester) async {
      await tester.pumpWidget(_wrap(
        const StatusBadge(status: DeviceStatus.warning),
        textScale: 3.0,
      ));
      await tester.pumpAndSettle();

      // No overflow/rendering exception, and the full label text exists
      // in the tree (not an ellipsis-truncated RenderObject failure).
      expect(tester.takeException(), isNull);
      final textWidget = tester.widget<Text>(find.text('Peringatan'));
      expect(textWidget.data, 'Peringatan');
    });

    testWidgets('moisture ring semantics still exposes full value text at 3x scale', (tester) async {
      await tester.pumpWidget(_wrap(
        const MoistureRing(value: 42, status: DeviceStatus.normal, showStatusLabel: true),
        textScale: 3.0,
      ));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(
        find.bySemanticsLabel('Kelembapan tanah 42 persen, status Normal'),
        findsOneWidget,
      );
    });
  });
}
