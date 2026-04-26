class ChatMessage {
  final String id;
  final String sessionId;
  final String role;
  final String content;
  final Map<String, dynamic>? attachments;
  final String createdAt;
  final bool isStreaming;

  ChatMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    this.attachments,
    required this.createdAt,
    this.isStreaming = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      sessionId: json['session_id'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
      attachments: json['attachments'] as Map<String, dynamic>?,
      createdAt: json['created_at'] as String,
    );
  }

  ChatMessage copyWith({String? content, bool? isStreaming}) {
    return ChatMessage(
      id: id,
      sessionId: sessionId,
      role: role,
      content: content ?? this.content,
      attachments: attachments,
      createdAt: createdAt,
      isStreaming: isStreaming ?? this.isStreaming,
    );
  }

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
}
