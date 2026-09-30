import 'package:flutter/material.dart';
import '../../models/support.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class SupportChatScreen extends StatefulWidget {
  final SupportRequest ticket;
  final VoidCallback onTicketUpdated;

  const SupportChatScreen({super.key, required this.ticket, required this.onTicketUpdated});

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _msgController = TextEditingController();

  List<SupportMessage> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  late SupportRequest _currentTicket;

  @override
  void initState() {
    super.initState();
    _currentTicket = widget.ticket;
    _loadMessages();

    // Auto-transition to UnderReview when Admin/Manager/Staff opens a pending ticket
    if (_apiService.currentUser?.isStaffOrAdmin == true && _currentTicket.isPending) {
      _autoReviewTicket();
    }
  }

  Future<void> _autoReviewTicket() async {
    try {
      final updated = await _apiService.updateSupportStatus(_currentTicket.id, 'UnderReview');
      if (mounted) {
        setState(() => _currentTicket = updated);
        widget.onTicketUpdated();
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _msgController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final msgs = await _apiService.getSupportMessages(_currentTicket.id);
      if (mounted) {
        setState(() {
          _messages = msgs;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;

    _msgController.clear();
    setState(() => _isSending = true);

    try {
      // If staff is sending on a pending ticket, ensure status is transitioned to UnderReview first
      if (_currentTicket.isPending && _apiService.currentUser?.isStaffOrAdmin == true) {
        final updated = await _apiService.updateSupportStatus(_currentTicket.id, 'UnderReview');
        if (mounted) {
          setState(() => _currentTicket = updated);
          widget.onTicketUpdated();
        }
      }

      final newMsg = await _apiService.addSupportMessage(_currentTicket.id, text);
      if (mounted) {
        setState(() {
          _messages.add(newMsg);
          _isSending = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: ${e.toString().replaceAll('Exception: ', '')}')),
        );
      }
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    try {
      final updated = await _apiService.updateSupportStatus(_currentTicket.id, newStatus);
      if (mounted) {
        setState(() => _currentTicket = updated);
        widget.onTicketUpdated();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ticket status updated to $newStatus')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status update error: ${e.toString().replaceAll('Exception: ', '')}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isStaff = _apiService.currentUser?.isStaffOrAdmin == true;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ticket #${_currentTicket.id}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text(_currentTicket.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
        actions: [
          if (isStaff)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: _updateStatus,
              itemBuilder: (ctx) => [
                if (_currentTicket.isPending)
                  const PopupMenuItem(value: 'UnderReview', child: Text('Open for Review')),
                if (_currentTicket.isUnderReview)
                  const PopupMenuItem(value: 'Resolved', child: Text('Mark as Resolved')),
              ],
            ),
        ],
      ),
      body: Column(
        children: [
          // Ticket Overview Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _currentTicket.priority == 'High'
                            ? AppTheme.dangerBg
                            : (_currentTicket.priority == 'Medium' ? AppTheme.warningBg : AppTheme.primaryBg),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${_currentTicket.priority} Priority',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _currentTicket.priority == 'High'
                              ? AppTheme.dangerDark
                              : (_currentTicket.priority == 'Medium' ? AppTheme.warningDark : AppTheme.primary),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _currentTicket.status,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: _currentTicket.isResolved ? AppTheme.successDark : AppTheme.primary,
                      ),
                    ),
                  ],
                ),
                Text(
                  _currentTicket.createdAt.toIso8601String().substring(0, 10),
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Initial Detail
          Container(
            padding: const EdgeInsets.all(16),
            width: double.infinity,
            color: AppTheme.scaffoldBg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Original Request:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.textMuted)),
                const SizedBox(height: 4),
                Text(_currentTicket.detail, style: const TextStyle(color: AppTheme.deepHeading, fontSize: 14)),
              ],
            ),
          ),
          const Divider(height: 1),

          // Status Action Banner
          if (_currentTicket.isPending)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: AppTheme.warningBg,
              child: Row(
                children: [
                  const Icon(Icons.hourglass_top_rounded, color: AppTheme.warningDark, size: 18),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Request is Pending. Chat unlocks when placed under review.',
                      style: TextStyle(color: AppTheme.warningDark, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (isStaff) ...[
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _updateStatus('UnderReview'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.warningDark,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Start Review', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ],
              ),
            )
          else if (_currentTicket.isUnderReview && isStaff)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppTheme.primaryBg,
              child: Row(
                children: [
                  const Icon(Icons.forum_outlined, color: AppTheme.primary, size: 18),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Under Active Review • Chat is live',
                      style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _updateStatus('Resolved'),
                    icon: const Icon(Icons.check_rounded, size: 14),
                    label: const Text('Mark Resolved', style: TextStyle(fontSize: 11)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
            )
          else if (_currentTicket.isResolved)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: AppTheme.successBg,
              child: const Row(
                children: [
                  Icon(Icons.check_circle_outline, color: AppTheme.successDark, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This ticket has been marked as Resolved by support.',
                      style: TextStyle(color: AppTheme.successDark, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          // Messages List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          _currentTicket.isUnderReview
                              ? 'No messages yet. Send a reply below.'
                              : 'Chat is active when ticket is Under Review.',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, idx) {
                          final msg = _messages[idx];
                          final isMe = msg.senderName == _apiService.currentUser?.fullName;

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(12),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                              decoration: BoxDecoration(
                                color: isMe ? AppTheme.primary : Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: isMe ? null : Border.all(color: AppTheme.border),
                              ),
                              child: Column(
                                crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    msg.senderName,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 11,
                                      color: isMe ? Colors.white70 : AppTheme.textMuted,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    msg.message,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: isMe ? Colors.white : AppTheme.deepHeading,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Input Bar (if UnderReview or Staff)
          if (_currentTicket.isUnderReview || isStaff)
            Container(
              padding: const EdgeInsets.all(12),
              color: Colors.white,
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _msgController,
                        decoration: const InputDecoration(
                          hintText: 'Type your message...',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _isSending ? null : _sendMessage,
                      icon: _isSending
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send_rounded),
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
