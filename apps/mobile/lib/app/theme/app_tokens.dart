import 'package:flutter/material.dart';

/// Design tokens from `.agents/DESIGN.md` (Adobe Spectrum 2 snapshot,
/// `@adobe/spectrum-tokens` v15.6.0), mapped into a [ThemeExtension] so
/// widgets never scatter raw hex colors or magic numbers.
@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.backgroundBase,
    required this.backgroundLayer1,
    required this.backgroundPasteboard,
    required this.neutralContent,
    required this.neutralSubdued,
    required this.neutralPlaceholder,
    required this.neutralDisabled,
    required this.borderSubtle,
    required this.borderStrong,
    required this.accent,
    required this.accentHover,
    required this.accentSubtle,
    required this.onAccent,
    required this.focusIndicator,
    required this.positive,
    required this.positiveSubtle,
    required this.positiveContent,
    required this.notice,
    required this.noticeSubtle,
    required this.noticeContent,
    required this.negative,
    required this.negativeSubtle,
    required this.negativeContent,
    required this.onNegative,
    required this.informative,
    required this.informativeSubtle,
    required this.informativeContent,
    required this.chartSoil,
    required this.chartTemperature,
    required this.chartHumidity,
    required this.chartWater,
    required this.overlay,
    required this.spacingXs,
    required this.spacingSm,
    required this.spacingMd,
    required this.spacingLg,
    required this.spacingXl,
    required this.spacingXxl,
    required this.spacingXxxl,
    required this.spacingXxxxl,
    required this.radiusSm,
    required this.radiusMd,
    required this.radiusLg,
    required this.radiusXl,
    required this.radiusFull,
    required this.dataLg,
    required this.dataMd,
    required this.dataSm,
    required this.detailStyle,
    required this.labelStyle,
    required this.codeStyle,
  });

  // Surfaces
  final Color backgroundBase;
  final Color backgroundLayer1;
  final Color backgroundPasteboard;

  // Text
  final Color neutralContent;
  final Color neutralSubdued;
  final Color neutralPlaceholder;
  final Color neutralDisabled;

  // Borders
  final Color borderSubtle;
  final Color borderStrong;

  // Interaction
  final Color accent;
  final Color accentHover;
  final Color accentSubtle;
  final Color onAccent;
  final Color focusIndicator;

  // Status: Normal
  final Color positive;
  final Color positiveSubtle;
  final Color positiveContent;

  // Status: Warning
  final Color notice;
  final Color noticeSubtle;
  final Color noticeContent;

  // Status: Critical
  final Color negative;
  final Color negativeSubtle;
  final Color negativeContent;
  final Color onNegative;

  // Status: Water low / informative
  final Color informative;
  final Color informativeSubtle;
  final Color informativeContent;

  // Charts
  final Color chartSoil;
  final Color chartTemperature;
  final Color chartHumidity;
  final Color chartWater;

  final Color overlay;

  // Spacing scale
  final double spacingXs;
  final double spacingSm;
  final double spacingMd;
  final double spacingLg;
  final double spacingXl;
  final double spacingXxl;
  final double spacingXxxl;
  final double spacingXxxxl;

  // Radii
  final double radiusSm;
  final double radiusMd;
  final double radiusLg;
  final double radiusXl;
  final double radiusFull;

  // Data-dense typography not covered by the Material text theme.
  // All use tabular figures so sensor values and timestamps align.
  final TextStyle dataLg;
  final TextStyle dataMd;
  final TextStyle dataSm;
  final TextStyle detailStyle;
  final TextStyle labelStyle;
  final TextStyle codeStyle;

  static const String fontFamily = 'Source Sans 3';
  static const String codeFontFamily = 'Source Code Pro';

  static const AppTokens light = AppTokens(
    backgroundBase: Color(0xFFFFFFFF),
    backgroundLayer1: Color(0xFFF8F8F8),
    backgroundPasteboard: Color(0xFFE9E9E9),
    neutralContent: Color(0xFF292929),
    neutralSubdued: Color(0xFF505050),
    neutralPlaceholder: Color(0xFF717171),
    neutralDisabled: Color(0xFFC6C6C6),
    borderSubtle: Color(0xFFE1E1E1),
    borderStrong: Color(0xFF8F8F8F),
    accent: Color(0xFF3B63FB),
    accentHover: Color(0xFF274DEA),
    accentSubtle: Color(0xFFE5F0FE),
    onAccent: Color(0xFFFFFFFF),
    focusIndicator: Color(0xFF4B75FF),
    positive: Color(0xFF05834E),
    positiveSubtle: Color(0xFFD7F7E1),
    positiveContent: Color(0xFF036E45),
    notice: Color(0xFFC24E00),
    noticeSubtle: Color(0xFFFFECCF),
    noticeContent: Color(0xFFA73E00),
    negative: Color(0xFFD73220),
    negativeSubtle: Color(0xFFFFEBE8),
    negativeContent: Color(0xFFB72818),
    onNegative: Color(0xFFFFFFFF),
    informative: Color(0xFF3B63FB),
    informativeSubtle: Color(0xFFE5F0FE),
    informativeContent: Color(0xFF274DEA),
    chartSoil: Color(0xFF05834E),
    chartTemperature: Color(0xFFC24E00),
    chartHumidity: Color(0xFF3B63FB),
    chartWater: Color(0xFF087E89),
    overlay: Color(0x66000000),
    spacingXs: 4,
    spacingSm: 8,
    spacingMd: 12,
    spacingLg: 16,
    spacingXl: 24,
    spacingXxl: 32,
    spacingXxxl: 48,
    spacingXxxxl: 64,
    radiusSm: 4,
    radiusMd: 8,
    radiusLg: 10,
    radiusXl: 16,
    radiusFull: 999,
    dataLg: TextStyle(
      fontFamily: fontFamily,
      fontSize: 28,
      height: 32 / 28,
      fontWeight: FontWeight.w700,
      color: Color(0xFF292929),
      fontFeatures: [FontFeature.tabularFigures()],
    ),
    dataMd: TextStyle(
      fontFamily: fontFamily,
      fontSize: 20,
      height: 24 / 20,
      fontWeight: FontWeight.w700,
      color: Color(0xFF292929),
      fontFeatures: [FontFeature.tabularFigures()],
    ),
    dataSm: TextStyle(
      fontFamily: fontFamily,
      fontSize: 14,
      height: 18 / 14,
      fontWeight: FontWeight.w600,
      color: Color(0xFF292929),
      fontFeatures: [FontFeature.tabularFigures()],
    ),
    detailStyle: TextStyle(
      fontFamily: fontFamily,
      fontSize: 12,
      height: 16 / 12,
      fontWeight: FontWeight.w500,
      color: Color(0xFF505050),
    ),
    labelStyle: TextStyle(
      fontFamily: fontFamily,
      fontSize: 14,
      height: 18 / 14,
      fontWeight: FontWeight.w700,
      color: Color(0xFF292929),
    ),
    codeStyle: TextStyle(
      fontFamily: codeFontFamily,
      fontSize: 13,
      height: 20 / 13,
      fontWeight: FontWeight.w400,
      color: Color(0xFF292929),
    ),
  );

  @override
  AppTokens copyWith() => this;

  @override
  AppTokens lerp(ThemeExtension<AppTokens>? other, double t) {
    // V1 ships a single light theme only; no interpolation needed.
    if (other is! AppTokens) return this;
    return other;
  }
}

/// Convenience accessor: `context.tokens.accent`.
extension AppTokensContext on BuildContext {
  AppTokens get tokens => Theme.of(this).extension<AppTokens>() ?? AppTokens.light;
}
