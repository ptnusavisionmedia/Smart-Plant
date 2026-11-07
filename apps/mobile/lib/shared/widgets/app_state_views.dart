import 'package:flutter/material.dart';

import '../../app/theme/app_tokens.dart';

/// DESIGN.md "Empty, loading, error, and offline states": 24dp muted icon,
/// title, body, and exactly one primary action.
class EmptyStateView extends StatelessWidget {
  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Center(
      child: Padding(
        padding: EdgeInsets.all(tokens.spacingXl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: tokens.neutralSubdued),
            SizedBox(height: tokens.spacingMd),
            Text(title, style: tokens.labelStyle.copyWith(fontSize: 16), textAlign: TextAlign.center),
            SizedBox(height: tokens.spacingSm),
            Text(
              body,
              style: tokens.detailStyle.copyWith(fontSize: 14),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              SizedBox(height: tokens.spacingLg),
              ElevatedButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Error state with a stated cause and a recovery action — DESIGN.md
/// explicitly forbids a bare "Terjadi kesalahan" with nothing else.
class ErrorStateView extends StatelessWidget {
  const ErrorStateView({
    super.key,
    required this.message,
    this.retryLabel = 'Coba lagi',
    this.onRetry,
  });

  final String message;
  final String retryLabel;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Center(
      child: Padding(
        padding: EdgeInsets.all(tokens.spacingXl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 24, color: tokens.negative),
            SizedBox(height: tokens.spacingMd),
            Text(message, style: tokens.detailStyle.copyWith(fontSize: 14), textAlign: TextAlign.center),
            if (onRetry != null) ...[
              SizedBox(height: tokens.spacingLg),
              OutlinedButton(onPressed: onRetry, child: Text(retryLabel)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Static skeleton block (no shimmer animation under reduced motion isn't
/// relevant here since it's static either way) used while layout-known
/// data loads.
class LoadingSkeleton extends StatelessWidget {
  const LoadingSkeleton({super.key, this.height = 16, this.width});

  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: tokens.backgroundPasteboard,
        borderRadius: BorderRadius.circular(tokens.radiusSm),
      ),
    );
  }
}
