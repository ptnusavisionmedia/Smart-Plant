import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// A canned HTTP response for [FakeHttpClientAdapter].
class FakeRoute {
  const FakeRoute({required this.method, required this.pathSuffix, required this.statusCode, this.body});

  final String method;

  /// Matched with [String.endsWith] against the request's URI path, so
  /// callers don't need to repeat the `/api/v1` prefix.
  final String pathSuffix;
  final int statusCode;
  final Object? body;
}

/// A minimal fake [HttpClientAdapter] so widget/integration tests can
/// exercise [ApiClient] end-to-end (including the 401-refresh-retry
/// interceptor) without a live backend, per the task's instruction to
/// test against "mocked API responses via a fake Dio adapter" rather
/// than requiring `apps/api` to be running.
class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.routes);

  final List<FakeRoute> routes;
  final List<RequestOptions> requestLog = [];

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requestLog.add(options);
    final path = options.uri.path;
    final method = options.method.toUpperCase();

    for (final route in routes) {
      if (route.method.toUpperCase() == method && path.endsWith(route.pathSuffix)) {
        final encoded = route.body == null ? '' : jsonEncode(route.body);
        return ResponseBody.fromString(
          encoded,
          route.statusCode,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      }
    }

    return ResponseBody.fromString(
      jsonEncode({'code': 'NOT_FOUND', 'message': 'No fake route for $method $path'}),
      404,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
