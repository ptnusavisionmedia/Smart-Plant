import 'package:flutter/material.dart';

import 'app_tokens.dart';

/// Builds the app [ThemeData] from Spectrum-derived [AppTokens].
///
/// V1 ships light theme only (per DESIGN.md); dark theme is a documented
/// follow-up and the semantic token names here are chosen so a dark set
/// can be added later without renaming.
class AppTheme {
  AppTheme._();

  static ThemeData light() {
    const tokens = AppTokens.light;

    final colorScheme = ColorScheme.fromSeed(
      seedColor: tokens.accent,
      brightness: Brightness.light,
      primary: tokens.accent,
      onPrimary: tokens.onAccent,
      secondary: tokens.accent,
      surface: tokens.backgroundBase,
      onSurface: tokens.neutralContent,
      error: tokens.negative,
      onError: tokens.onNegative,
    );

    final baseTextTheme = TextTheme(
      displayLarge: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 36,
        height: 42 / 36,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.36,
        color: tokens.neutralContent,
      ),
      headlineLarge: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 28,
        height: 32 / 28,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.28,
        color: tokens.neutralContent,
      ),
      headlineMedium: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 22,
        height: 26 / 22,
        fontWeight: FontWeight.w700,
        color: tokens.neutralContent,
      ),
      headlineSmall: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 18,
        height: 22 / 18,
        fontWeight: FontWeight.w700,
        color: tokens.neutralContent,
      ),
      titleMedium: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 16,
        height: 20 / 16,
        fontWeight: FontWeight.w700,
        color: tokens.neutralContent,
      ),
      bodyLarge: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 16,
        height: 1.5,
        fontWeight: FontWeight.w400,
        color: tokens.neutralContent,
      ),
      bodyMedium: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: 14,
        height: 1.5,
        fontWeight: FontWeight.w400,
        color: tokens.neutralContent,
      ),
      labelLarge: tokens.labelStyle,
      bodySmall: tokens.detailStyle,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: tokens.backgroundLayer1,
      fontFamily: AppTokens.fontFamily,
      textTheme: baseTextTheme,
      dividerColor: tokens.borderSubtle,
      splashFactory: InkRipple.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.backgroundBase,
        foregroundColor: tokens.neutralContent,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: baseTextTheme.headlineSmall,
      ),
      cardTheme: CardThemeData(
        color: tokens.backgroundBase,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(tokens.radiusXl),
          side: BorderSide(color: tokens.borderSubtle),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: tokens.backgroundBase,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(tokens.radiusXl),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: tokens.backgroundBase,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(tokens.radiusXl)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: tokens.backgroundBase,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        hintStyle: TextStyle(color: tokens.neutralPlaceholder, fontSize: 14),
        labelStyle: tokens.detailStyle.copyWith(fontWeight: FontWeight.w600),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          borderSide: BorderSide(color: tokens.borderStrong),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          borderSide: BorderSide(color: tokens.borderStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          borderSide: BorderSide(color: tokens.focusIndicator, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          borderSide: BorderSide(color: tokens.negative, width: 1),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          borderSide: BorderSide(color: tokens.borderSubtle),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: tokens.accent,
          foregroundColor: tokens.onAccent,
          disabledBackgroundColor: tokens.backgroundPasteboard,
          disabledForegroundColor: tokens.neutralDisabled,
          minimumSize: const Size.fromHeight(48),
          textStyle: tokens.labelStyle.copyWith(color: tokens.onAccent),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(tokens.radiusFull),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: tokens.backgroundBase,
          foregroundColor: tokens.neutralContent,
          minimumSize: const Size.fromHeight(40),
          textStyle: tokens.labelStyle,
          side: BorderSide(color: tokens.borderStrong),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(tokens.radiusFull),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: tokens.accent,
          textStyle: tokens.labelStyle.copyWith(color: tokens.accent),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: tokens.backgroundBase,
        selectedItemColor: tokens.accent,
        unselectedItemColor: tokens.neutralSubdued,
        selectedLabelStyle: tokens.detailStyle,
        unselectedLabelStyle: tokens.detailStyle,
        type: BottomNavigationBarType.fixed,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: tokens.neutralContent,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
        ),
      ),
      extensions: const [tokens],
    );
  }
}
