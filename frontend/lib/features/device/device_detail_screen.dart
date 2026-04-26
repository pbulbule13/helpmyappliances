import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_service.dart';
import '../../providers/device_provider.dart';

class DeviceDetailScreen extends ConsumerStatefulWidget {
  final String deviceId;
  const DeviceDetailScreen({super.key, required this.deviceId});

  @override
  ConsumerState<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends ConsumerState<DeviceDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _problemController = TextEditingController();
  bool _isCreatingSession = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _problemController.dispose();
    super.dispose();
  }

  Future<void> _startTroubleshoot() async {
    if (_problemController.text.isEmpty) return;

    setState(() => _isCreatingSession = true);

    try {
      final api = ref.read(apiServiceProvider);
      final session = await api.createSession(
        widget.deviceId,
        _problemController.text,
      );
      if (mounted) {
        _problemController.clear();
        context.go('/troubleshoot/${session['id']}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to start session')),
        );
      }
    } finally {
      if (mounted) setState(() => _isCreatingSession = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final deviceAsync = ref.watch(deviceDetailProvider(widget.deviceId));

    return deviceAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error loading device: $e')),
      ),
      data: (device) => Scaffold(
        appBar: AppBar(
          title: Text(device.displayName),
          actions: [
            PopupMenuButton(
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                const PopupMenuItem(value: 'delete', child: Text('Delete')),
              ],
              onSelected: (value) async {
                if (value == 'delete') {
                  await ref
                      .read(deviceNotifierProvider.notifier)
                      .deleteDevice(device.id);
                  if (mounted) context.go('/');
                }
              },
            ),
          ],
          bottom: TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Info'),
              Tab(text: 'Documents'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            // Info Tab
            SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _InfoCard(
                    children: [
                      _InfoRow('Brand', device.brand),
                      _InfoRow('Model', device.modelNumber),
                      if (device.serialNumber != null)
                        _InfoRow('Serial', device.serialNumber!),
                      _InfoRow('Category', device.category),
                      if (device.room.isNotEmpty) _InfoRow('Room', device.room),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Troubleshoot section
                  Text(
                    'Need help with this appliance?',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _problemController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Describe the problem...\ne.g., Display not working, making loud noise',
                      labelText: 'What\'s wrong?',
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _isCreatingSession ? null : _startTroubleshoot,
                    icon: _isCreatingSession
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.chat),
                    label: const Text('Start Troubleshooting'),
                  ),

                  const SizedBox(height: 16),

                  // Safety disclaimer
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.tertiaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber, color: theme.colorScheme.tertiary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'AI guidance is not a substitute for professional repair. For gas leaks or electrical hazards, call a licensed professional.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onTertiaryContainer,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Documents Tab
            _DocumentsTab(deviceId: widget.deviceId),

            // History Tab
            _HistoryTab(deviceId: widget.deviceId),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: children),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            )),
          ),
        ],
      ),
    );
  }
}

class _DocumentsTab extends ConsumerWidget {
  final String deviceId;
  const _DocumentsTab({required this.deviceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return FutureBuilder<Map<String, dynamic>>(
      future: ref.read(apiServiceProvider).getDeviceDocuments(deviceId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final docs = (snapshot.data?['documents'] as List?) ?? [];

        if (docs.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.description_outlined, size: 64,
                    color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5)),
                const SizedBox(height: 12),
                Text('No documents yet', style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text('Documents will be fetched automatically',
                    style: theme.textTheme.bodySmall),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final doc = docs[index] as Map<String, dynamic>;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(_getDocIcon(doc['doc_type'] as String?)),
                title: Text(doc['title'] as String? ?? 'Document'),
                subtitle: Text(doc['doc_type'] as String? ?? ''),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () {
                  final url = doc['source_url'] as String?;
                  if (url != null) launchUrl(Uri.parse(url));
                },
              ),
            );
          },
        );
      },
    );
  }

  IconData _getDocIcon(String? type) {
    switch (type) {
      case 'manual':
        return Icons.menu_book;
      case 'video':
        return Icons.play_circle_outline;
      case 'parts_diagram':
        return Icons.settings;
      case 'recall_notice':
        return Icons.warning_amber;
      case 'spec_sheet':
        return Icons.description;
      default:
        return Icons.article;
    }
  }
}

class _HistoryTab extends ConsumerWidget {
  final String deviceId;
  const _HistoryTab({required this.deviceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return FutureBuilder<Map<String, dynamic>>(
      future: ref.read(apiServiceProvider).listSessions(deviceId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final sessions = (snapshot.data?['sessions'] as List?) ?? [];

        if (sessions.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.history, size: 64,
                    color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5)),
                const SizedBox(height: 12),
                Text('No troubleshooting history', style: theme.textTheme.titleMedium),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: sessions.length,
          itemBuilder: (context, index) {
            final session = sessions[index] as Map<String, dynamic>;
            final status = session['status'] as String? ?? 'active';

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(
                  status == 'resolved' ? Icons.check_circle : Icons.pending,
                  color: status == 'resolved' ? Colors.green : Colors.orange,
                ),
                title: Text(session['problem_summary'] as String? ?? ''),
                subtitle: Text(session['created_at'] as String? ?? ''),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/troubleshoot/${session['id']}'),
              ),
            );
          },
        );
      },
    );
  }
}
