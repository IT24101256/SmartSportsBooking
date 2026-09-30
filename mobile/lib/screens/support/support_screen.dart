import 'package:flutter/material.dart';
import '../../models/support.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import 'support_chat_screen.dart';

class SupportScreen extends StatefulWidget {
  final List<SupportRequest> supportRequests;
  final bool isLoading;
  final VoidCallback onRefresh;

  const SupportScreen({
    super.key,
    required this.supportRequests,
    required this.isLoading,
    required this.onRefresh,
  });

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final ApiService _apiService = ApiService();

  void _openCreateTicketDialog() {
    final titleCtrl = TextEditingController();
    final detailCtrl = TextEditingController();
    String priority = 'Medium';
    bool isSaving = false;
    String? error;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('New Support Request'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Subject / Title', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: detailCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Details of your query', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: priority,
                  decoration: const InputDecoration(labelText: 'Priority Level', border: OutlineInputBorder()),
                  items: ['Low', 'Medium', 'High'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                  onChanged: (val) {
                    if (val != null) setDlgState(() => priority = val);
                  },
                ),
                if (error != null) ...[
                  const SizedBox(height: 10),
                  Text(error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isSaving
                  ? null
                  : () async {
                      final t = titleCtrl.text.trim();
                      final d = detailCtrl.text.trim();
                      if (t.isEmpty || d.isEmpty) {
                        setDlgState(() => error = 'Please enter both subject and details.');
                        return;
                      }

                      setDlgState(() => isSaving = true);
                      try {
                        await _apiService.createSupportRequest(title: t, detail: d, priority: priority);
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        widget.onRefresh();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Support ticket submitted successfully!')),
                        );
                      } catch (err) {
                        setDlgState(() {
                          isSaving = false;
                          error = err.toString().replaceAll('Exception: ', '');
                        });
                      }
                    },
              child: isSaving
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit Ticket'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Support Tickets (${widget.supportRequests.length})',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
              ),
              ElevatedButton.icon(
                onPressed: _openCreateTicketDialog,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Ticket'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          if (widget.supportRequests.isEmpty)
            Container(
              padding: const EdgeInsets.all(40),
              alignment: Alignment.center,
              child: Column(
                children: [
                  const Icon(Icons.support_agent_outlined, size: 48, color: AppTheme.textMuted),
                  const SizedBox(height: 12),
                  const Text('No support requests logged.', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading)),
                  const SizedBox(height: 4),
                  const Text('Have an issue with a court or booking? Create a ticket.', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: _openCreateTicketDialog, child: const Text('Open Support Ticket')),
                ],
              ),
            )
          else
            ...widget.supportRequests.map((req) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.border),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SupportChatScreen(ticket: req, onTicketUpdated: widget.onRefresh),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: req.priority == 'High'
                                    ? AppTheme.dangerBg
                                    : (req.priority == 'Medium' ? AppTheme.warningBg : AppTheme.primaryBg),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${req.priority} Priority',
                                style: TextStyle(
                                  color: req.priority == 'High'
                                      ? AppTheme.dangerDark
                                      : (req.priority == 'Medium' ? AppTheme.warningDark : AppTheme.primary),
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: req.isResolved
                                    ? AppTheme.successBg
                                    : (req.isUnderReview ? AppTheme.purpleBg : const Color(0xFFF1F5F9)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                req.status,
                                style: TextStyle(
                                  color: req.isResolved
                                      ? AppTheme.successDark
                                      : (req.isUnderReview ? AppTheme.purple : const Color(0xFF64748B)),
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          req.title,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.deepHeading),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          req.detail,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppTheme.textBody, fontSize: 13),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Ticket #${req.id}',
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                            const Row(
                              children: [
                                Text('Open Chat', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontSize: 12)),
                                SizedBox(width: 4),
                                Icon(Icons.arrow_forward_ios, size: 10, color: AppTheme.primary),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
