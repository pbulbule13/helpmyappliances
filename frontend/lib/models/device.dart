class Device {
  final String id;
  final String householdId;
  final String brand;
  final String modelNumber;
  final String? serialNumber;
  final String category;
  final String nickname;
  final String room;
  final String? purchaseDate;
  final String? photoUrl;
  final Map<String, dynamic>? specifications;
  final Map<String, dynamic>? documentationUrls;
  final String createdAt;
  final String updatedAt;

  Device({
    required this.id,
    required this.householdId,
    required this.brand,
    required this.modelNumber,
    this.serialNumber,
    required this.category,
    required this.nickname,
    required this.room,
    this.purchaseDate,
    this.photoUrl,
    this.specifications,
    this.documentationUrls,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] as String,
      householdId: json['household_id'] as String,
      brand: json['brand'] as String? ?? '',
      modelNumber: json['model_number'] as String,
      serialNumber: json['serial_number'] as String?,
      category: json['category'] as String? ?? 'other',
      nickname: json['nickname'] as String? ?? '',
      room: json['room'] as String? ?? '',
      purchaseDate: json['purchase_date'] as String?,
      photoUrl: json['photo_url'] as String?,
      specifications: json['specifications'] as Map<String, dynamic>?,
      documentationUrls: json['documentation_urls'] as Map<String, dynamic>?,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
    );
  }

  String get displayName {
    if (nickname.isNotEmpty) return nickname;
    if (brand.isNotEmpty) return '$brand $modelNumber';
    return modelNumber;
  }

  IconData get categoryIcon {
    switch (category) {
      case 'dishwasher':
        return _Icons.dishwasher;
      case 'washer':
        return _Icons.washer;
      case 'dryer':
        return _Icons.dryer;
      case 'refrigerator':
        return _Icons.fridge;
      case 'oven':
        return _Icons.oven;
      case 'microwave':
        return _Icons.microwave;
      case 'hvac':
        return _Icons.hvac;
      default:
        return _Icons.appliance;
    }
  }
}

// Using Unicode code points for Material Icons
class _Icons {
  static const dishwasher = 0xe836; // kitchen
  static const washer = 0xf04e; // local_laundry_service
  static const dryer = 0xf04e;
  static const fridge = 0xe43c; // kitchen
  static const oven = 0xf04f; // microwave
  static const microwave = 0xf04f;
  static const hvac = 0xe1d5; // ac_unit
  static const appliance = 0xe88a; // home
}
