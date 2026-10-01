import 'package:flutter/material.dart';
import '../services/api_service.dart';

class BookWithAiSheet extends StatefulWidget {
  final VoidCallback onBookingCreated;

  const BookWithAiSheet({super.key, required this.onBookingCreated});

  static Future<void> show(BuildContext context, {required VoidCallback onBookingCreated}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookWithAiSheet(onBookingCreated: onBookingCreated),
    );
  }

  @override
  State<BookWithAiSheet> createState() => _BookWithAiSheetState();
}

class _BookWithAiSheetState extends State<BookWithAiSheet> {
  final ApiService _apiService = ApiService();
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  String? _workflowId;
  int _currentStep = 1;
  String _status = 'collecting_requirements';
  Map<String, dynamic>? _summary;
  List<String> _suggestedOptions = [];
  List<String> _availableSlots = [];
  List<String> _missingFields = [];
  List<String> _trajectory = [];
  bool _showTrajectory = false;
  Map<String, dynamic>? _confirmedBooking;
  final String _paymentChoice = 'Card';
  bool _isLoading = false;

  final List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _startWorkflow();
  }

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

  Future<void> _startWorkflow() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.startAiBookingWorkflow();
      setState(() {
        _workflowId = res['workflowId'] as String?;
        _currentStep = (res['currentStep'] as num?)?.toInt() ?? 1;
        _status = res['status'] as String? ?? 'collecting_requirements';
        _suggestedOptions = (res['suggestedOptions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        _availableSlots = (res['availableSlots'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        _trajectory = (res['trajectory'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

        _messages.add({
          'role': 'assistant',
          'content': res['message'] as String? ?? 'Hello! Which sport or venue would you like to book?',
        });
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'Could not start AI booking workflow. Please ensure you are signed in and backend is running.',
          'isError': true,
        });
        _isLoading = false;
      });
    }
  }

  Future<void> _sendMessage([String? presetText]) async {
    final text = (presetText ?? _inputController.text).trim();
    if (text.isEmpty || _isLoading || _workflowId == null) return;

    _inputController.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final res = await _apiService.sendAiBookingMessage(
        workflowId: _workflowId!,
        message: text,
      );

      setState(() {
        _currentStep = (res['currentStep'] as num?)?.toInt() ?? 1;
        _status = res['status'] as String? ?? 'collecting_requirements';
        _summary = res['summary'] as Map<String, dynamic>?;
        _suggestedOptions = (res['suggestedOptions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        _availableSlots = (res['availableSlots'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        _missingFields = (res['missingFields'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
        if (res['trajectory'] != null) {
          _trajectory = (res['trajectory'] as List<dynamic>).map((e) => e.toString()).toList();
        }

        _messages.add({
          'role': 'assistant',
          'content': res['message'] as String? ?? '',
        });
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'An error occurred during workflow step processing. Please try again.',
          'isError': true,
        });
        _isLoading = false;
      });
    }
  }

  Future<void> _confirmBooking() async {
    if (_workflowId == null || _isLoading) return;

    setState(() => _isLoading = true);
    try {
      final res = await _apiService.confirmAiBooking(
        workflowId: _workflowId!,
        paymentMethod: _paymentChoice,
        cardLastFour: '4242',
      );

      setState(() {
        _currentStep = 4;
        _status = 'completed';
        _confirmedBooking = res['booking'] as Map<String, dynamic>? ?? res;
        if (res['trajectory'] != null) {
          _trajectory = (res['trajectory'] as List<dynamic>).map((e) => e.toString()).toList();
        }

        _messages.add({
          'role': 'assistant',
          'content': res['message'] as String? ?? '🎉 Booking confirmed!',
          'isCelebration': true,
        });
        _isLoading = false;
      });
      _scrollToBottom();
      widget.onBookingCreated();
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'Booking confirmation failed: $e',
          'isError': true,
        });
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    final steps = [
      {'num': 1, 'title': 'Venue & Slot'},
      {'num': 2, 'title': 'Player Details'},
      {'num': 3, 'title': 'Payment & Confirm'},
      {'num': 4, 'title': 'Confirmed'},
    ];

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
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
                color: Colors.white.withValues(alpha: 0.2),
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
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0284C7), Color(0xFF6366F1), Color(0xFFA855F7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(
                    child: Text('✨', style: TextStyle(fontSize: 20)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Book With AI',
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _status.replaceAll('_', ' ').toUpperCase(),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9, fontWeight: FontWeight.w700),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Text(
                        'Supervisor Multi-Agent Workflow',
                        style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 22),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          // Stepper Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white.withValues(alpha: 0.03),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: steps.map((s) {
                  final numVal = s['num'] as int;
                  final isCurrent = numVal == _currentStep;
                  final isDone = numVal < _currentStep;

                  return Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? const Color(0xFF0284C7).withValues(alpha: 0.25)
                          : isDone
                              ? const Color(0xFF10B981).withValues(alpha: 0.2)
                              : Colors.white.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isCurrent
                            ? const Color(0xFF0284C7)
                            : isDone
                                ? const Color(0xFF10B981)
                                : Colors.white.withValues(alpha: 0.08),
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 8,
                          backgroundColor: isCurrent
                              ? const Color(0xFF0284C7)
                              : isDone
                                  ? const Color(0xFF10B981)
                                  : Colors.white.withValues(alpha: 0.15),
                          child: Text(
                            isDone ? '✓' : '$numVal',
                            style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          s['title'] as String,
                          style: TextStyle(
                            color: isCurrent
                                ? const Color(0xFF38BDF8)
                                : isDone
                                    ? const Color(0xFF6EE7B7)
                                    : const Color(0xFF64748B),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          if (_missingFields.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Row(
                children: [
                  const Text('Pending: ', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.w700)),
                  Expanded(
                    child: Text(
                      _missingFields.join(', '),
                      style: const TextStyle(color: Color(0xFFFCD34D), fontSize: 11),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Trajectory Toggle
          InkWell(
            onTap: () => setState(() => _showTrajectory = !_showTrajectory),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Row(
                children: [
                  Icon(
                    _showTrajectory ? Icons.arrow_drop_down_rounded : Icons.arrow_right_rounded,
                    color: const Color(0xFF64748B),
                    size: 18,
                  ),
                  Text(
                    'Multi-Agent Trajectory (${_trajectory.length} events)',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),

          if (_showTrajectory) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              constraints: const BoxConstraints(maxHeight: 100),
              child: ListView(
                children: _trajectory.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• $t', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, fontFamily: 'monospace')),
                )).toList(),
              ),
            ),
          ],

          // Chat Flow
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                ..._messages.map((m) {
                  final isUser = m['role'] == 'user';
                  final isError = m['isError'] == true;
                  final isCelebration = m['isCelebration'] == true;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isUser) ...[
                          Container(
                            width: 28,
                            height: 28,
                            margin: const EdgeInsets.only(right: 8, top: 2),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [Color(0xFF0284C7), Color(0xFF8B5CF6)]),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Center(child: Text('🤖', style: TextStyle(fontSize: 13))),
                          ),
                        ],
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: isUser
                                  ? const Color(0xFF0284C7)
                                  : isCelebration
                                      ? const Color(0xFF065F46).withValues(alpha: 0.7)
                                      : isError
                                          ? const Color(0xFF7F1D1D).withValues(alpha: 0.5)
                                          : const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(18).copyWith(
                                bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(18),
                                bottomLeft: !isUser ? const Radius.circular(4) : const Radius.circular(18),
                              ),
                              border: Border.all(
                                color: isCelebration
                                    ? const Color(0xFF10B981)
                                    : isError
                                        ? const Color(0xFFDC2626)
                                        : Colors.white.withValues(alpha: 0.08),
                              ),
                            ),
                            child: Text(
                              m['content'] as String,
                              style: TextStyle(
                                color: isCelebration
                                    ? const Color(0xFFA7F3D0)
                                    : isError
                                        ? const Color(0xFFFCA5A5)
                                        : Colors.white,
                                fontSize: 13.5,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),

                if (_isLoading) ...[
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF0284C7), Color(0xFF8B5CF6)]),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Center(child: Text('🤖', style: TextStyle(fontSize: 13))),
                      ),
                      const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF38BDF8))),
                      const SizedBox(width: 8),
                      const Text('Agent checking backend availability...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ],
                  ),
                ],

                // Live Available Slots Chips
                if (_availableSlots.isNotEmpty && _currentStep == 1 && _confirmedBooking == null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('🕒 Available Slots (Tap to select):', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: _availableSlots.map((slot) {
                            return ActionChip(
                              label: Text(slot, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                              backgroundColor: const Color(0xFF0284C7).withValues(alpha: 0.2),
                              side: const BorderSide(color: Color(0xFF0284C7)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              onPressed: () => _sendMessage('I want slot $slot'),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                ],

                // Summary Card for Step 3
                if (_summary != null && _currentStep == 3 && _confirmedBooking == null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.4)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                          blurRadius: 16,
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Text('📋 ', style: TextStyle(fontSize: 16)),
                            Text('Reservation Summary', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _SummaryRow(label: '🏟️ Venue', value: '${_summary!['facilityName']}'),
                        _SummaryRow(label: '📅 Date', value: '${_summary!['bookingDate']}'),
                        _SummaryRow(label: '⏰ Time', value: '${_summary!['startTime']} – ${_summary!['endTime']} (${_summary!['hoursNeeded']} hr)'),
                        _SummaryRow(label: '👤 Player', value: '${_summary!['customerName']} (${_summary!['contactNumber']})'),
                        const Divider(color: Colors.white10, height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Amount', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w600)),
                            Text(
                              'LKR ${_summary!['totalAmount']}',
                              style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 18, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _isLoading ? null : _confirmBooking,
                          icon: const Icon(Icons.check_circle_rounded, size: 18),
                          label: const Text('Confirm & Book Now'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 44),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Quick options
                if (_suggestedOptions.isNotEmpty && _confirmedBooking == null) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _suggestedOptions.map((opt) {
                      return ActionChip(
                        label: Text(opt, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                        backgroundColor: Colors.white.withValues(alpha: 0.06),
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        onPressed: () => _sendMessage(opt),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),

          // Input Bar or Confirmation Complete
          if (_confirmedBooking == null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                border: Border(top: BorderSide(color: Colors.white10)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: TextField(
                        controller: _inputController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          hintText: 'e.g. Badminton tomorrow at 7 PM for 2 hours',
                          hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                          border: InputBorder.none,
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    icon: const Icon(Icons.send_rounded, size: 18),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _isLoading ? null : () => _sendMessage(),
                  ),
                ],
              ),
            ),
          ] else ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: ElevatedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.confirmation_number_rounded),
                label: const Text('View Pass in Bookings'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
