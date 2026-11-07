import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../shared/models/notification_models.dart';
import '../../../shared/models/ws_event_models.dart';
import '../data/notification_repository.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(apiClient: ref.watch(apiClientProvider));
});

class NotificationsState {
  const NotificationsState({
    this.items = const [],
    this.nextCursor,
    this.unreadCount = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
  });

  final List<AppNotification> items;
  final String? nextCursor;
  final int unreadCount;
  final bool isLoading;
  final bool isLoadingMore;
  final Object? error;

  NotificationsState copyWith({
    List<AppNotification>? items,
    String? nextCursor,
    bool clearCursor = false,
    int? unreadCount,
    bool? isLoading,
    bool? isLoadingMore,
    Object? error,
    bool clearError = false,
  }) => NotificationsState(
        items: items ?? this.items,
        nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
        unreadCount: unreadCount ?? this.unreadCount,
        isLoading: isLoading ?? this.isLoading,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        error: clearError ? null : (error ?? this.error),
      );
}

/// Cursor-paginated notification list (per `NotificationListResponseSchema`)
/// that also reacts to live `notification` WS events by prepending them
/// (T-47).
class NotificationsController extends StateNotifier<NotificationsState> {
  NotificationsController(this._repository, Stream<WsServerEvent>? wsEvents)
      : super(const NotificationsState()) {
    _subscription = wsEvents?.listen(_handleWsEvent);
    refresh();
  }

  final NotificationRepository _repository;
  StreamSubscription<WsServerEvent>? _subscription;

  void _handleWsEvent(WsServerEvent event) {
    if (event is WsNotificationEvent) {
      state = state.copyWith(
        items: [event.notification, ...state.items],
        unreadCount: state.unreadCount + (event.notification.isUnread ? 1 : 0),
      );
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _repository.list();
      state = state.copyWith(
        items: response.items,
        nextCursor: response.nextCursor,
        clearCursor: response.nextCursor == null,
        unreadCount: response.unreadCount,
        isLoading: false,
      );
    } catch (error) {
      state = state.copyWith(isLoading: false, error: error);
    }
  }

  Future<void> loadMore() async {
    if (state.nextCursor == null || state.isLoadingMore) return;
    state = state.copyWith(isLoadingMore: true);
    try {
      final response = await _repository.list(cursor: state.nextCursor);
      state = state.copyWith(
        items: [...state.items, ...response.items],
        nextCursor: response.nextCursor,
        clearCursor: response.nextCursor == null,
        unreadCount: response.unreadCount,
        isLoadingMore: false,
      );
    } catch (_) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  Future<void> markRead(String id) async {
    final previous = state.items;
    final target = previous.firstWhere((n) => n.id == id, orElse: () => previous.first);
    if (!target.isUnread) return;
    state = state.copyWith(
      items: [
        for (final n in previous) if (n.id == id) n.copyWith(readAt: DateTime.now()) else n,
      ],
      unreadCount: (state.unreadCount - 1).clamp(0, 1 << 30),
    );
    try {
      await _repository.markRead(id);
    } catch (_) {
      state = state.copyWith(items: previous, unreadCount: state.unreadCount + 1);
    }
  }

  Future<void> markAllRead() async {
    final previous = state.items;
    state = state.copyWith(
      items: [for (final n in previous) n.copyWith(readAt: n.readAt ?? DateTime.now())],
      unreadCount: 0,
    );
    try {
      await _repository.markAllRead();
    } catch (_) {
      state = state.copyWith(items: previous);
      await refresh();
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final notificationsControllerProvider =
    StateNotifierProvider<NotificationsController, NotificationsState>((ref) {
  final wsClient = ref.watch(wsClientProvider);
  return NotificationsController(ref.watch(notificationRepositoryProvider), wsClient.events);
});

final notificationPreferencesProvider =
    FutureProvider.autoDispose<NotificationPreferences>((ref) {
  return ref.watch(notificationRepositoryProvider).getPreferences();
});
