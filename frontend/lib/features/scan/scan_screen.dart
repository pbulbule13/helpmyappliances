import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_service.dart';
import '../../providers/device_provider.dart';
import '../../providers/household_provider.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _modelController = TextEditingController();
  final _brandController = TextEditingController();
  final _nicknameController = TextEditingController();

  Uint8List? _imageBytes;
  bool _isScanning = false;
  bool _isSaving = false;
  String? _error;
  String _category = 'other';
  String _room = '';
  bool _scanComplete = false;

  final _categories = [
    'dishwasher', 'washer', 'dryer', 'refrigerator',
    'oven', 'microwave', 'hvac', 'other',
  ];

  final _rooms = [
    '', 'Kitchen', 'Laundry Room', 'Bathroom', 'Basement',
    'Garage', 'Living Room', 'Bedroom', 'Other',
  ];

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );

    if (picked == null) return;

    final bytes = await picked.readAsBytes();
    setState(() {
      _imageBytes = bytes;
      _error = null;
    });

    await _scanImage(bytes, picked.name);
  }

  Future<void> _scanImage(Uint8List bytes, String filename) async {
    setState(() {
      _isScanning = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final result = await api.scanPhoto(bytes, filename);

      if (result['success'] == true && result['result'] != null) {
        final scanResult = result['result'] as Map<String, dynamic>;
        setState(() {
          _modelController.text = scanResult['model_number'] as String? ?? '';
          _brandController.text = scanResult['brand'] as String? ?? '';
          _category = scanResult['suggested_category'] as String? ?? 'other';
          _scanComplete = true;
        });
      } else {
        setState(() {
          _error = result['error'] as String? ?? 'Could not read the label.';
          _scanComplete = true; // Still show form for manual entry
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to scan image. You can enter details manually.';
        _scanComplete = true;
      });
    } finally {
      setState(() => _isScanning = false);
    }
  }

  Future<void> _saveDevice() async {
    if (_modelController.text.isEmpty) {
      setState(() => _error = 'Model number is required');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      // Get or create default household
      final households = await ref.read(householdsProvider.future);
      String householdId;

      if (households.isEmpty) {
        final api = ref.read(apiServiceProvider);
        final newHousehold = await api.createHousehold('My Home');
        householdId = newHousehold['id'] as String;
      } else {
        householdId = households.first.id;
      }

      final device = await ref.read(deviceNotifierProvider.notifier).createDevice({
        'household_id': householdId,
        'model_number': _modelController.text,
        'brand': _brandController.text,
        'nickname': _nicknameController.text,
        'category': _category,
        'room': _room,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appliance added successfully!')),
        );
        context.go('/device/${device.id}');
      }
    } catch (e) {
      setState(() => _error = 'Failed to save device. Please try again.');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _modelController.dispose();
    _brandController.dispose();
    _nicknameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Scan Appliance')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image capture area
            if (_imageBytes == null) ...[
              _CaptureArea(onPickImage: _pickImage),
            ] else ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.memory(
                  _imageBytes!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () => setState(() {
                  _imageBytes = null;
                  _scanComplete = false;
                  _modelController.clear();
                  _brandController.clear();
                }),
                icon: const Icon(Icons.refresh),
                label: const Text('Retake Photo'),
              ),
            ],

            if (_isScanning) ...[
              const SizedBox(height: 24),
              const Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 12),
                    Text('Reading appliance label...'),
                  ],
                ),
              ),
            ],

            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _error!,
                  style: TextStyle(color: theme.colorScheme.onErrorContainer),
                ),
              ),
            ],

            if (_scanComplete) ...[
              const SizedBox(height: 24),
              Text(
                'Appliance Details',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),

              TextField(
                controller: _modelController,
                decoration: const InputDecoration(
                  labelText: 'Model Number *',
                  hintText: 'e.g., SHP878ZD5N',
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _brandController,
                decoration: const InputDecoration(
                  labelText: 'Brand',
                  hintText: 'e.g., Bosch',
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _nicknameController,
                decoration: const InputDecoration(
                  labelText: 'Nickname (optional)',
                  hintText: 'e.g., Kitchen Dishwasher',
                ),
              ),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: _categories
                    .map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(c[0].toUpperCase() + c.substring(1)),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _category = v ?? 'other'),
              ),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                value: _room,
                decoration: const InputDecoration(labelText: 'Room'),
                items: _rooms
                    .map((r) => DropdownMenuItem(
                          value: r,
                          child: Text(r.isEmpty ? 'Select room' : r),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _room = v ?? ''),
              ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: _isSaving ? null : _saveDevice,
                child: _isSaving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save Appliance'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CaptureArea extends StatelessWidget {
  final Function(ImageSource) onPickImage;
  const _CaptureArea({required this.onPickImage});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      height: 240,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
          style: BorderStyle.solid,
          width: 2,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.camera_alt_outlined,
            size: 48,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'Take a photo of the model number plate',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FilledButton.icon(
                onPressed: () => onPickImage(ImageSource.camera),
                icon: const Icon(Icons.camera_alt),
                label: const Text('Camera'),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () => onPickImage(ImageSource.gallery),
                icon: const Icon(Icons.photo_library),
                label: const Text('Gallery'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
