import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AiChatMessageItem {
  final String role; // 'user' or 'assistant'
  final String content;
  final List<String> sources;
  final List<String> suggestedFollowUps;
  final List<String> toolInvocations;
  final bool isError;

  AiChatMessageItem({
    required this.role,
    required this.content,
    this.sources = const [],
    this.suggestedFollowUps = const [],
    this.toolInvocations = const [],
    this.isError = false,
  });
}

class AiChatSheet extends StatefulWidget {
  const AiChatSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const AiChatSheet(),
    );
  }

  @override
  State<AiChatSheet> createState() => _AiChatSheetState();
}

class _AiChatSheetState extends State<AiChatSheet> {
  final ApiService _apiService = ApiService();
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<AiChatMessageItem> _messages = [
    AiChatMessageItem(
      role: 'assistant',
      content:
          'Hello! I am your MySpot Knowledge Assistant 🤖\n\nAsk me anything about our facilities, rates, operating hours, refund rules, rain-check rescheduling, or booking process.',
      sources: ['MySpot Knowledge Base'],
      suggestedFollowUps: [
        'What sports are available?',
        'What is the cancellation policy?',
        'What is the cheapest facility?',
        'How does Book With AI work?',
      ],
    ),
  ];

  bool _isLoading = false;
  String? _conversationId;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? presetText]) async {
    final text = (presetText ?? _inputController.text).trim();
    if (text.isEmpty || _isLoading) return;

    _inputController.clear();
    setState(() {
      _messages.add(AiChatMessageItem(role: 'user', content: text));
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final res = await _apiService.chatWithAi(
        message: text,
        conversationId: _conversationId,
      );

      final answer = res['answer'] as String? ?? 'No response received.';
      final convId = res['conversationId'] as String?;
      if (convId != null) {
        _conversationId = convId;
      }

      final sources = (res['sources'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final followUps = (res['suggestedFollowUps'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final tools = (res['toolInvocations'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

      if (mounted) {
        setState(() {
          _messages.add(AiChatMessageItem(
            role: 'assistant',
            content: answer,
            sources: sources,
            suggestedFollowUps: followUps,
            toolInvocations: tools,
          ));
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(AiChatMessageItem(
            role: 'assistant',
            content: 'Could not connect to the MySpot AI Assistant. Please check your backend connection.',
            isError: true,
          ));
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF071A2B), Color(0xFF0B2740)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Color(0xFF2878FF), width: 1.5),
        ),
      ),
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1D4ED8), Color(0xFF20D6C7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF20D6C7).withValues(alpha: 0.35),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(2),
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF0B2740),
                      shape: BoxShape.circle,
                    ),
                    padding: const EdgeInsets.all(6),
                    child: Image.asset(
                      'assets/images/chatbot.png',
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MySpot AI Assistant',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.8),
                                  blurRadius: 5,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Online • Smart Sports RAG',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: Color(0xFF94A3B8), size: 20),
                  tooltip: 'Reset Chat',
                  onPressed: () {
                    setState(() {
                      _conversationId = null;
                      _messages.clear();
                      _messages.add(AiChatMessageItem(
                        role: 'assistant',
                        content: 'Chat refreshed. Ask me anything about MySpot sports, venues, hours, prices, or policies!',
                        sources: ['MySpot Knowledge Base'],
                        suggestedFollowUps: ['What sports are available?', 'What is the cancellation policy?'],
                      ));
                    });
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 22),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          const Divider(color: Colors.white10, height: 1),

          // Chat Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              itemCount: _messages.length,
              itemBuilder: (ctx, i) {
                final msg = _messages[i];
                final isUser = msg.role == 'user';

                return Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Column(
                    crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (!isUser) ...[
                            Container(
                              width: 30,
                              height: 30,
                              margin: const EdgeInsets.only(right: 8, top: 2),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF1D4ED8), Color(0xFF20D6C7)],
                                ),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF20D6C7).withValues(alpha: 0.25),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              padding: const EdgeInsets.all(1.5),
                              child: Container(
                                decoration: const BoxDecoration(
                                  color: Color(0xFF0B2740),
                                  shape: BoxShape.circle,
                                ),
                                padding: const EdgeInsets.all(4),
                                child: Image.asset(
                                  'assets/images/chatbot.png',
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ],
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                gradient: isUser
                                    ? const LinearGradient(
                                        colors: [Color(0xFF1D4ED8), Color(0xFF2563EB)],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      )
                                    : null,
                                color: isUser
                                    ? null
                                    : msg.isError
                                        ? const Color(0xFF7F1D1D).withValues(alpha: 0.5)
                                        : const Color(0xFF0D2639),
                                borderRadius: BorderRadius.circular(18).copyWith(
                                  bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(18),
                                  bottomLeft: !isUser ? const Radius.circular(4) : const Radius.circular(18),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: isUser
                                        ? const Color(0xFF1D4ED8).withValues(alpha: 0.35)
                                        : Colors.black.withValues(alpha: 0.25),
                                    blurRadius: 10,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                                border: Border.all(
                                  color: isUser
                                      ? Colors.transparent
                                      : msg.isError
                                          ? const Color(0xFFDC2626)
                                          : Colors.white.withValues(alpha: 0.09),
                                ),
                              ),
                              child: Text(
                                msg.content,
                                style: TextStyle(
                                  color: msg.isError ? const Color(0xFFFCA5A5) : const Color(0xFFF8FAFC),
                                  fontSize: 14,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Tool Invocation Badge
                      if (!isUser && msg.toolInvocations.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.only(left: 38, top: 6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.35)),
                            ),
                            child: Text(
                              '⚡ Live Verified: ${msg.toolInvocations.join(', ')}',
                              style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 10, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],

                      // Source tags
                      if (!isUser && msg.sources.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.only(left: 38, top: 6),
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              const Text('Sources:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w600)),
                              ...msg.sources.map((s) => Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.06),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFF20D6C7).withValues(alpha: 0.3)),
                                    ),
                                    child: Text(s, style: const TextStyle(color: Color(0xFF20D6C7), fontSize: 10, fontWeight: FontWeight.w700)),
                                  )),
                            ],
                          ),
                        ),
                      ],

                      // Follow-Up Questions
                      if (!isUser && msg.suggestedFollowUps.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.only(left: 38, top: 8),
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: msg.suggestedFollowUps.map((q) {
                              return ActionChip(
                                avatar: const Icon(Icons.auto_awesome_rounded, size: 12, color: Color(0xFF20D6C7)),
                                label: Text(
                                  q,
                                  style: const TextStyle(
                                    color: Color(0xFF93C5FD),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                backgroundColor: const Color(0xFF1D4ED8).withValues(alpha: 0.12),
                                side: BorderSide(color: const Color(0xFF2878FF).withValues(alpha: 0.3)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                onPressed: () => _sendMessage(q),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),

          if (_isLoading) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF20D6C7)]),
                      shape: BoxShape.circle,
                    ),
                    padding: const EdgeInsets.all(1.5),
                    child: Container(
                      decoration: const BoxDecoration(color: Color(0xFF0B2740), shape: BoxShape.circle),
                      padding: const EdgeInsets.all(4),
                      child: Image.asset('assets/images/chatbot.png', fit: BoxFit.contain),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF20D6C7)),
                  ),
                  const SizedBox(width: 10),
                  const Text('Searching MySpot knowledge base...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                ],
              ),
            ),
          ],

          // Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFF071A2B),
              border: Border(top: BorderSide(color: Colors.white10)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF0D2639),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: TextField(
                          controller: _inputController,
                          cursorColor: const Color(0xFF20D6C7),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          decoration: const InputDecoration(
                            isDense: true,
                            filled: true,
                            fillColor: Color(0xFF0D2639),
                            hintText: 'Ask about sports, prices, rules...',
                            hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(vertical: 12),
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1D4ED8), Color(0xFF20D6C7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF1D4ED8).withValues(alpha: 0.35),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: _isLoading ? null : () => _sendMessage(),
                          child: const Center(
                            child: Icon(Icons.arrow_upward_rounded, size: 22, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Grounded in MySpot real-time policies • Live slot verified',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
