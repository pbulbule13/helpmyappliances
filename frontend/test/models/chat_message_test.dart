import 'package:flutter_test/flutter_test.dart';
import 'package:helpmyappliances/models/chat_message.dart';

void main() {
  group('ChatMessage', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': '123',
        'session_id': '456',
        'role': 'assistant',
        'content': 'Hello, how can I help?',
        'attachments': null,
        'created_at': '2024-01-15T10:00:00Z',
      };

      final message = ChatMessage.fromJson(json);

      expect(message.id, '123');
      expect(message.role, 'assistant');
      expect(message.content, 'Hello, how can I help?');
      expect(message.isAssistant, true);
      expect(message.isUser, false);
    });

    test('isUser returns true for user role', () {
      final message = ChatMessage(
        id: '1',
        sessionId: '2',
        role: 'user',
        content: 'My dishwasher is broken',
        createdAt: '2024-01-01',
      );

      expect(message.isUser, true);
      expect(message.isAssistant, false);
    });

    test('copyWith updates content', () {
      final original = ChatMessage(
        id: '1',
        sessionId: '2',
        role: 'assistant',
        content: 'Hello',
        createdAt: '2024-01-01',
      );

      final updated = original.copyWith(content: 'Hello, updated');
      expect(updated.content, 'Hello, updated');
      expect(updated.id, '1');
      expect(updated.role, 'assistant');
    });

    test('copyWith updates isStreaming', () {
      final message = ChatMessage(
        id: '1',
        sessionId: '2',
        role: 'assistant',
        content: 'Streaming...',
        createdAt: '2024-01-01',
        isStreaming: true,
      );

      final stopped = message.copyWith(isStreaming: false);
      expect(stopped.isStreaming, false);
    });
  });
}
