import 'package:flutter_test/flutter_test.dart';
import 'package:helpmyappliances/models/household.dart';

void main() {
  group('Household', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': '123e4567-e89b-12d3-a456-426614174000',
        'owner_id': '123e4567-e89b-12d3-a456-426614174001',
        'name': 'My Home',
        'created_at': '2024-01-15T10:00:00Z',
      };

      final household = Household.fromJson(json);

      expect(household.id, '123e4567-e89b-12d3-a456-426614174000');
      expect(household.ownerId, '123e4567-e89b-12d3-a456-426614174001');
      expect(household.name, 'My Home');
    });
  });
}
