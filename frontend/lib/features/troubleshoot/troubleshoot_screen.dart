import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../models/chat_message.dart';

class TroubleshootScreen extends ConsumerStatefulWidget {
  final String sessionId;
  const TroubleshootScreen({super.key, required this.sessionId});

  @override
  ConsumerState<TroubleshootScreen> createState() => _TroubleshootScreenState();
}

class _TroubleshootScreenState extends ConsumerState<TroubleshootScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];

  bool _isLoading = true;
  bool _isSending = false;
  String _streamingContent = '';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final api = ref.read(apiServiceProvider);
      final data = await api.getSessionHistory(widget.sessionId);
      final messages = (data['messages'] as List)
          .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
          .toList();

      setState(() {
        _messages.addAll(messages);
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    _messageController.clear();

    // Add user message
    final userMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sessionId: widget.sessionId,
      role: 'user',
      content: text,
      createdAt: DateTime.now().toIso8601String(),
    );

    setState(() {
      _messages.add(userMessage);
      _isSending = true;
      _streamingContent = '';
    });
    _scrollToBottom();

    // Stream AI response
    try {
      final api = ref.read(apiServiceProvider);
      await for (final chunk in api.sendMessage(widget.sessionId, text)) {
        setState(() => _streamingContent += chunk);
        _scrollToBottom();
      }

      // Finalize the assistant message
      final assistantMessage = ChatMessage(
        id: '${DateTime.now().millisecondsSinceEpoch}_ai',
        sessionId: widget.sessionId,
        role: 'assistant',
        content: _streamingContent,
        createdAt: DateTime.now().toIso8601String(),
      );

      setState(() {
        _messages.add(assistantMessage);
        _streamingContent = '';
        _isSending = false;
      });
    } catch (e) {
      setState(() {
        if (_streamingContent.isNotEmpty) {
          _messages.add(ChatMessage(
            id: '${DateTime.now().millisecondsSinceEpoch}_ai',
            sessionId: widget.sessionId,
            role: 'assistant',
            content: _streamingContent.isNotEmpty
                ? _streamingContent
                : 'Sorry, something went wrong. Please try again.',
            createdAt: DateTime.now().toIso8601String(),
          ));
        }
        _streamingContent = '';
        _isSending = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Troubleshooting'),
        actions: [
          IconButton(
            icon: const Icon(Icons.warning_amber_outlined),
            tooltip: 'Safety Info',
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Safety Notice'),
                  content: const Text(
                    'This is AI-generated guidance. For gas leaks, electrical hazards, '
                    'or if you feel unsafe at any point, stop and contact a licensed '
                    'professional immediately.\n\nAlways disconnect power before '
                    'working on any electrical appliance.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Got it'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_streamingContent.isNotEmpty ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _streamingContent.isNotEmpty) {
                        return _MessageBubble(
                          content: _streamingContent,
                          isUser: false,
                          isStreaming: true,
                        );
                      }
                      final message = _messages[index];
                      return _MessageBubble(
                        content: message.content,
                        isUser: message.isUser,
                      );
                    },
                  ),
          ),

          // Input bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(
                top: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Describe your issue...',
                        filled: true,
                        fillColor: theme.colorScheme.surfaceContainerLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _isSending ? null : _sendMessage,
                    icon: _isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final String content;
  final bool isUser;
  final bool isStreaming;

  const _MessageBubble({
    required this.content,
    required this.isUser,
    this.isStreaming = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Icon(
                Icons.build_circle,
                size: 18,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser
                    ? theme.colorScheme.primary
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    content,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isUser
                          ? theme.colorScheme.onPrimary
                          : theme.colorScheme.onSurface,
                    ),
                  ),
                  if (isStreaming) ...[
                    const SizedBox(height: 4),
                    SizedBox(
                      width: 20,
                      height: 10,
                      child: LinearProgressIndicator(
                        backgroundColor: Colors.transparent,
                        color: theme.colorScheme.primary.withOpacity(0.5),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }
}
