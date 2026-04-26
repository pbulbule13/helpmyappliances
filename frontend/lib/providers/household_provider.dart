import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/api_service.dart';
import '../models/household.dart';

final householdsProvider = FutureProvider<List<Household>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final response = await api.listHouseholds();
  final households = (response['households'] as List)
      .map((h) => Household.fromJson(h as Map<String, dynamic>))
      .toList();
  return households;
});
