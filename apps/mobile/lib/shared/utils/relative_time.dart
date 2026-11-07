/// Formats the difference between [time] and [now] as a short Indonesian
/// relative duration ("12 detik", "3 menit", "2 jam"), used by the
/// live/stale indicator and notification rows.
String formatRelativeTime(DateTime time, DateTime now) {
  final diff = now.difference(time);
  if (diff.isNegative || diff.inSeconds < 1) return '1 detik';
  if (diff.inSeconds < 60) return '${diff.inSeconds} detik';
  if (diff.inMinutes < 60) return '${diff.inMinutes} menit';
  if (diff.inHours < 24) return '${diff.inHours} jam';
  return '${diff.inDays} hari';
}
