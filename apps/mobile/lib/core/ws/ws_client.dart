import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../../shared/models/ws_event_models.dart';
import '../api/api_client.dart';

/// Connects to `GET /ws` (Tech Spec §3) and exposes a broadcast [Stream]
/// of decoded [WsServerEvent]s. The server subscribes the connection to
/// every device room owned by the authenticated user, so a single
/// connection is enough for the whole app.
///
/// Reconnects with simple backoff when the socket closes unexpectedly
/// (e.g. the 90s idle timeout or a network blip); callers don't need to
/// manage reconnection themselves.
class WsClient {
  WsClient({required Future<String?> Function() getAccessToken, String? baseUrl})
      : _getAccessToken = getAccessToken,
        _baseUrl = baseUrl ?? kApiBaseUrl;

  final Future<String?> Function() _getAccessToken;
  final String _baseUrl;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  final _eventsController = StreamController<WsServerEvent>.broadcast();
  bool _disposed = false;
  int _reconnectAttempt = 0;
  Timer? _reconnectTimer;

  Stream<WsServerEvent> get events => _eventsController.stream;

  Future<void> connect() async {
    if (_disposed) return;
    final token = await _getAccessToken();
    if (token == null || token.isEmpty) return;
    final wsBase = _baseUrl.replaceFirst('http', 'ws');
    final uri = Uri.parse('$wsBase/ws').replace(queryParameters: {'token': token});

    try {
      final channel = WebSocketChannel.connect(uri);
      _channel = channel;
      _subscription = channel.stream.listen(
        _handleMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
        cancelOnError: true,
      );
      _reconnectAttempt = 0;
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic raw) {
    try {
      final json = jsonDecode(raw as String) as Map<String, dynamic>;
      final event = WsServerEvent.fromJson(json);
      if (!_eventsController.isClosed) _eventsController.add(event);
    } catch (_) {
      // Ignore malformed frames; the heartbeat ping/pong is handled by the
      // web_socket_channel transport layer, not surfaced here.
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _reconnectAttempt = (_reconnectAttempt + 1).clamp(0, 5);
    final delay = Duration(seconds: _reconnectAttempt * 2);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, connect);
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    _disposed = true;
    disconnect();
    _eventsController.close();
  }
}
