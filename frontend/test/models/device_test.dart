import 'package:flutter_test/flutter_test.dart';
import 'package:helpmyappliances/models/device.dart';

void main() {
  group('Device', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': '123e4567-e89b-12d3-a456-426614174000',
        'household_id': '123e4567-e89b-12d3-a456-426614174001',
        'brand': 'Bosch',
        'model_number': 'SHP878ZD5N',
        'serial_number': 'SN123456',
        'category': 'dishwasher',
        'nickname': 'Kitchen Dishwasher',
        'room': 'Kitchen',
        'purchase_date': '2024-01-15',
        'photo_url': null,
        'specifications': null,
        'documentation_urls': null,
        'created_at': '2024-01-15T10:00:00Z',
        'updated_at': '2024-01-15T10:00:00Z',
      };

      final device = Device.fromJson(json);

      expect(device.id, '123e4567-e89b-12d3-a456-426614174000');
      expect(device.brand, 'Bosch');
      expect(device.modelNumber, 'SHP878ZD5N');
      expect(device.category, 'dishwasher');
      expect(device.nickname, 'Kitchen Dishwasher');
      expect(device.room, 'Kitchen');
    });

    test('displayName returns nickname when available', () {
      final device = Device(
        id: '1',
        householdId: '2',
        brand: 'Bosch',
        modelNumber: 'SHP878ZD5N',
        category: 'dishwasher',
        nickname: 'Kitchen Dishwasher',
        room: 'Kitchen',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      );

      expect(device.displayName, 'Kitchen Dishwasher');
    });

    test('displayName falls back to brand + model', () {
      final device = Device(
        id: '1',
        householdId: '2',
        brand: 'Bosch',
        modelNumber: 'SHP878ZD5N',
        category: 'dishwasher',
        nickname: '',
        room: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      );

      expect(device.displayName, 'Bosch SHP878ZD5N');
    });

    test('displayName falls back to model number only', () {
      final device = Device(
        id: '1',
        householdId: '2',
        brand: '',
        modelNumber: 'SHP878ZD5N',
        category: 'dishwasher',
        nickname: '',
        room: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      );

      expect(device.displayName, 'SHP878ZD5N');
    });
  });
}
