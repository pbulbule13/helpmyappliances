import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/api_service.dart';
import '../models/device.dart';

final devicesProvider = FutureProvider.family<List<Device>, String?>((ref, householdId) async {
  final api = ref.watch(apiServiceProvider);
  final response = await api.listDevices(householdId: householdId);
  final devices = (response['devices'] as List)
      .map((d) => Device.fromJson(d as Map<String, dynamic>))
      .toList();
  return devices;
});

final deviceDetailProvider = FutureProvider.family<Device, String>((ref, deviceId) async {
  final api = ref.watch(apiServiceProvider);
  final response = await api.getDevice(deviceId);
  return Device.fromJson(response);
});

class DeviceNotifier extends StateNotifier<AsyncValue<List<Device>>> {
  final ApiService _api;

  DeviceNotifier(this._api) : super(const AsyncValue.loading()) {
    loadDevices();
  }

  Future<void> loadDevices({String? householdId}) async {
    state = const AsyncValue.loading();
    try {
      final response = await _api.listDevices(householdId: householdId);
      final devices = (response['devices'] as List)
          .map((d) => Device.fromJson(d as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(devices);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<Device> createDevice(Map<String, dynamic> data) async {
    final response = await _api.createDevice(data);
    final device = Device.fromJson(response);
    await loadDevices();
    return device;
  }

  Future<void> deleteDevice(String deviceId) async {
    await _api.deleteDevice(deviceId);
    await loadDevices();
  }
}

final deviceNotifierProvider =
    StateNotifierProvider<DeviceNotifier, AsyncValue<List<Device>>>((ref) {
  return DeviceNotifier(ref.watch(apiServiceProvider));
});
