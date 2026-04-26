import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref.watch(apiClientProvider));
});

class ApiService {
  final ApiClient _client;

  ApiService(this._client);

  // Auth
  Future<Map<String, dynamic>> verifyToken() async {
    final response = await _client.post('/auth/verify');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _client.get('/auth/me');
    return response.data as Map<String, dynamic>;
  }

  // Households
  Future<Map<String, dynamic>> listHouseholds() async {
    final response = await _client.get('/households/');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createHousehold(String name) async {
    final response = await _client.post('/households/', data: {'name': name});
    return response.data as Map<String, dynamic>;
  }

  // Devices
  Future<Map<String, dynamic>> listDevices({String? householdId}) async {
    final params = <String, dynamic>{};
    if (householdId != null) params['household_id'] = householdId;
    final response = await _client.get('/devices/', queryParameters: params);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createDevice(Map<String, dynamic> data) async {
    final response = await _client.post('/devices/', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getDevice(String deviceId) async {
    final response = await _client.get('/devices/$deviceId');
    return response.data as Map<String, dynamic>;
  }

  Future<void> deleteDevice(String deviceId) async {
    await _client.delete('/devices/$deviceId');
  }

  // Scan
  Future<Map<String, dynamic>> scanPhoto(Uint8List imageBytes, String filename) async {
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(imageBytes, filename: filename),
    });
    final response = await _client.upload('/scan/photo', formData);
    return response.data as Map<String, dynamic>;
  }

  // Troubleshoot
  Future<Map<String, dynamic>> createSession(
      String deviceId, String problemSummary) async {
    final response = await _client.post('/troubleshoot/sessions', data: {
      'device_id': deviceId,
      'problem_summary': problemSummary,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> listSessions(String deviceId) async {
    final response = await _client.get('/troubleshoot/sessions',
        queryParameters: {'device_id': deviceId});
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getSessionHistory(String sessionId) async {
    final response = await _client.get('/troubleshoot/sessions/$sessionId');
    return response.data as Map<String, dynamic>;
  }

  Stream<String> sendMessage(String sessionId, String content) async* {
    final response = await _client.dio.post(
      '/troubleshoot/sessions/$sessionId/message',
      data: {'content': content},
      options: Options(responseType: ResponseType.stream),
    );

    final stream = response.data.stream as Stream<Uint8List>;
    String buffer = '';

    await for (final chunk in stream) {
      buffer += utf8.decode(chunk);
      final lines = buffer.split('\n');
      buffer = lines.last;

      for (int i = 0; i < lines.length - 1; i++) {
        final line = lines[i].trim();
        if (line.startsWith('data: ')) {
          final data = line.substring(6);
          if (data == '[DONE]') return;
          yield data;
        }
      }
    }
  }

  // Documents
  Future<Map<String, dynamic>> getDeviceDocuments(String deviceId,
      {String? docType}) async {
    final params = <String, dynamic>{};
    if (docType != null) params['doc_type'] = docType;
    final response =
        await _client.get('/documents/device/$deviceId', queryParameters: params);
    return response.data as Map<String, dynamic>;
  }
}
