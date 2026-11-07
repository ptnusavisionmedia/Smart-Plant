import 'dart:async';

import 'package:mobile/core/ws/ws_client.dart';
import 'package:mobile/shared/models/ws_event_models.dart';

/// A [WsClient] that never touches a real socket. `connect()`/`disconnect()`
/// are no-ops; tests can push events through [emit] to simulate server
/// pushes (reading/status/presence/watering/notification).
class FakeWsClient extends WsClient {
  FakeWsClient() : super(getAccessToken: () async => null);

  final _controller = StreamController<WsServerEvent>.broadcast();

  @override
  Stream<WsServerEvent> get events => _controller.stream;

  @override
  Future<void> connect() async {
    // Intentionally does nothing: no real socket in tests.
  }

  @override
  void disconnect() {}

  void emit(WsServerEvent event) => _controller.add(event);

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}
