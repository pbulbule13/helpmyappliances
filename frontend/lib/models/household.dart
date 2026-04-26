class Household {
  final String id;
  final String ownerId;
  final String name;
  final String createdAt;

  Household({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.createdAt,
  });

  factory Household.fromJson(Map<String, dynamic> json) {
    return Household(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      name: json['name'] as String,
      createdAt: json['created_at'] as String,
    );
  }
}
