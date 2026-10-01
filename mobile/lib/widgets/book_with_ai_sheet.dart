import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../services/saved_cards_service.dart';

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
  final SavedCardsService _cardsService = SavedCardsService();
  final ImagePicker _picker = ImagePicker();

  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  // Payment controllers
  final TextEditingController _savedCvvController = TextEditingController();
  final TextEditingController _cardNumberController = TextEditingController();
  final TextEditingController _newCvvController = TextEditingController();

  // Card Expiry Dropdown State (Month 01-12, Year next 10 years)
  String _selectedExpiryMonth = '01';
  late String _selectedExpiryYear;

  static final List<String> _monthsList = List.generate(12, (i) => (i + 1).toString().padLeft(2, '0'));
  List<String> get _yearsList {
    final start = DateTime.now().year;
    return List.generate(11, (i) => '${start + i}');
  }

  String? _workflowId;
  int _currentStep = 1;
  String _status = 'collecting_requirements';
  Map<String, dynamic>? _summary;
  List<String> _suggestedOptions = [];
  List<String> _availableSlots = [];
  final List<String> _selectedSlots = [];
  List<String> _missingFields = [];
  List<String> _trajectory = [];
  bool _showTrajectory = false;
  Map<String, dynamic>? _confirmedBooking;
  bool _isLoading = false;

  // Payment State
  String _paymentChoice = 'Card'; // 'Card', 'BankTransfer'
  String _cardChoice = 'saved'; // 'saved', 'new'
  List<SavedCard> _savedCards = [];
  String? _selectedSavedCardId;
  bool _saveCardDetails = true;
  XFile? _selectedBankSlip;
  Uint8List? _selectedBankSlipBytes;
  String? _selectedBankSlipName;
  String? _paymentError;

  final List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _selectedExpiryYear = '${DateTime.now().year}';
    _startWorkflow();
    _loadSavedCards();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _savedCvvController.dispose();
    _cardNumberController.dispose();
    _newCvvController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedCards() async {
    try {
      final cards = await _cardsService.getCards();
      if (mounted) {
        setState(() {
          _savedCards = cards;
          if (cards.isNotEmpty) {
            final defaultCard = cards.firstWhere((c) => c.isDefault, orElse: () => cards.first);
            _selectedSavedCardId = defaultCard.id;
            _cardChoice = 'saved';
          } else {
            _cardChoice = 'new';
          }
        });
      }
    } catch (_) {}
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
        _selectedSlots.clear();
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
      _paymentError = null;
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
        _selectedSlots.clear();
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

  // Linear multiple slots toggle logic
  void _toggleSlot(String slot) {
    setState(() {
      if (_selectedSlots.isEmpty) {
        _selectedSlots.add(slot);
        return;
      }

      if (_selectedSlots.contains(slot)) {
        if (_selectedSlots.length == 1) {
          _selectedSlots.clear();
          return;
        }
        if (_selectedSlots.first == slot) {
          _selectedSlots.removeAt(0);
          return;
        }
        if (_selectedSlots.last == slot) {
          _selectedSlots.removeLast();
          return;
        }
        final idx = _selectedSlots.indexOf(slot);
        _selectedSlots.removeRange(idx + 1, _selectedSlots.length);
        return;
      }

      // Check if contiguous range is possible among available slots
      final clickedHour = int.tryParse(slot.split(':').first) ?? 8;
      final existingHours = _selectedSlots.map((s) => int.tryParse(s.split(':').first) ?? 8).toList();
      existingHours.add(clickedHour);
      existingHours.sort();

      final minH = existingHours.first;
      final maxH = existingHours.last;

      final linearList = <String>[];
      bool isRangeValid = true;
      for (int h = minH; h <= maxH; h++) {
        final formatted = '${h.toString().padLeft(2, '0')}:00';
        if (!_availableSlots.contains(formatted)) {
          isRangeValid = false;
          break;
        }
        linearList.add(formatted);
      }

      if (isRangeValid) {
        _selectedSlots.clear();
        _selectedSlots.addAll(linearList);
      } else {
        // Fallback: select just the clicked slot
        _selectedSlots.clear();
        _selectedSlots.add(slot);
      }
    });
  }

  void _confirmSelectedSlots() {
    if (_selectedSlots.isEmpty) return;
    final sorted = [..._selectedSlots]..sort();
    final startHour = int.tryParse(sorted.first.split(':').first) ?? 8;
    final endHour = startHour + sorted.length;
    final formattedEnd = '${endHour.toString().padLeft(2, '0')}:00';

    _sendMessage('I want slots from ${sorted.first} to $formattedEnd for ${sorted.length} hours');
    setState(() {
      _selectedSlots.clear();
    });
  }

  Future<void> _pickDateFromPicker() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF0284C7),
              onPrimary: Colors.white,
              surface: Color(0xFF1E293B),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final formatted = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      _sendMessage('I want to book on $formatted');
    }
  }

  Future<void> _pickBankSlipImage() async {
    try {
      final photo = await _picker.pickImage(source: ImageSource.gallery);
      if (photo != null) {
        final bytes = await photo.readAsBytes();
        setState(() {
          _selectedBankSlip = photo;
          _selectedBankSlipBytes = bytes;
          _selectedBankSlipName = photo.name;
          _paymentError = null;
        });
      }
    } catch (e) {
      setState(() => _paymentError = 'Failed to load transfer slip: $e');
    }
  }

  Future<void> _confirmBooking() async {
    if (_workflowId == null || _isLoading) return;

    setState(() => _paymentError = null);

    // Validate payment credentials strictly
    if (_paymentChoice == 'Card') {
      if (_cardChoice == 'saved' && _savedCards.isNotEmpty) {
        final cvv = _savedCvvController.text.trim();
        if (cvv.length != 3 || !RegExp(r'^\d{3}$').hasMatch(cvv)) {
          setState(() => _paymentError = 'Please enter a valid 3-digit CVV security code.');
          return;
        }
      } else {
        final cardNum = _cardNumberController.text.replaceAll(RegExp(r'\s+|-'), '');
        if (cardNum.length != 16 || !RegExp(r'^\d{16}$').hasMatch(cardNum)) {
          setState(() => _paymentError = 'Please enter a valid 16-digit card number.');
          return;
        }
        final cvv = _newCvvController.text.trim();
        if (cvv.length != 3 || !RegExp(r'^\d{3}$').hasMatch(cvv)) {
          setState(() => _paymentError = 'Please enter a valid 3-digit CVV security code.');
          return;
        }
      }
    } else if (_paymentChoice == 'BankTransfer') {
      if (_selectedBankSlip == null || _selectedBankSlipBytes == null) {
        setState(() => _paymentError = 'Please upload your bank transfer payment slip / receipt.');
        return;
      }
    }

    setState(() => _isLoading = true);

    try {
      String? cardLastFour;
      String? cardNumberToSend;
      String? cvvToSend;
      int? expMonthToSend;
      int? expYearToSend;

      if (_paymentChoice == 'Card') {
        if (_cardChoice == 'saved' && _savedCards.isNotEmpty) {
          final active = _savedCards.firstWhere((c) => c.id == _selectedSavedCardId, orElse: () => _savedCards.first);
          cardLastFour = active.lastFour;
          cvvToSend = _savedCvvController.text.trim();
        } else {
          final raw = _cardNumberController.text.replaceAll(RegExp(r'\s+|-'), '');
          cardNumberToSend = raw;
          cardLastFour = raw.length >= 4 ? raw.substring(raw.length - 4) : '4242';
          cvvToSend = _newCvvController.text.trim();
          expMonthToSend = int.tryParse(_selectedExpiryMonth) ?? 1;
          expYearToSend = int.tryParse(_selectedExpiryYear) ?? DateTime.now().year;
        }
      }

      final res = await _apiService.confirmAiBooking(
        workflowId: _workflowId!,
        paymentMethod: _paymentChoice,
        cardNumber: cardNumberToSend,
        cardLastFour: cardLastFour,
        cvv: cvvToSend,
        expiryMonth: expMonthToSend,
        expiryYear: expYearToSend,
        bankSlip: _paymentChoice == 'BankTransfer' ? _selectedBankSlip : null,
      );

      // Save new card if chosen
      if (_paymentChoice == 'Card' && _cardChoice == 'new' && _saveCardDetails && cardNumberToSend != null) {
        await _cardsService.addCard(SavedCard(
          id: 'card_${DateTime.now().millisecondsSinceEpoch}',
          brand: cardNumberToSend.startsWith('5') ? 'Mastercard' : 'Visa',
          lastFour: cardLastFour ?? '4242',
          cardholderName: _summary?['customerName']?.toString().isNotEmpty == true ? _summary!['customerName'].toString() : 'Athlete Member',
          expiryMonth: _selectedExpiryMonth,
          expiryYear: _selectedExpiryYear,
          isDefault: _savedCards.isEmpty,
        ));
      }

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
        _paymentError = '$e'.replaceAll('Exception: ', '');
        _messages.add({
          'role': 'assistant',
          'content': 'Booking confirmation failed: $e',
          'isError': true,
        });
        _isLoading = false;
      });
    }
  }

  Widget _buildQuickChip({
    required String label,
    String? emoji,
    required VoidCallback onTap,
    bool isPrimary = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isPrimary ? const Color(0xFF0284C7).withValues(alpha: 0.25) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPrimary ? const Color(0xFF38BDF8) : const Color(0xFF334155),
              width: 1.2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (emoji != null) ...[
                Text(emoji, style: const TextStyle(fontSize: 13)),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  color: isPrimary ? const Color(0xFF38BDF8) : Colors.white,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabButton({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7).withValues(alpha: 0.3) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFF334155),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF38BDF8) : Colors.white70,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
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

    return Theme(
      data: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        canvasColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          surface: Color(0xFF1E293B),
          primary: Color(0xFF0284C7),
          onSurface: Colors.white,
        ),
      ),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.92,
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

                // Date Picker Quick Row (Step 1)
                if (_currentStep == 1 && (_summary == null || _summary!['bookingDate'] == null) && _confirmedBooking == null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('📅 Select Booking Date:', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildQuickChip(
                              label: 'Today',
                              emoji: '⚡',
                              onTap: () => _sendMessage('I want to book for Today'),
                            ),
                            _buildQuickChip(
                              label: 'Tomorrow',
                              emoji: '📅',
                              onTap: () => _sendMessage('I want to book for Tomorrow'),
                            ),
                            _buildQuickChip(
                              label: 'Pick a Date',
                              emoji: '🗓️',
                              isPrimary: true,
                              onTap: _pickDateFromPicker,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                // Live Available Slots Chips with Linear Multi-Slot Selection
                if (_availableSlots.isNotEmpty && _currentStep == 1 && _confirmedBooking == null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('🕒 Available Slots:', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w700)),
                            if (_selectedSlots.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0284C7),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '${_selectedSlots.length} hr(s) selected',
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Tap slots to select one or multiple consecutive hours',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: _availableSlots.map((slot) {
                            final isSelected = _selectedSlots.contains(slot);
                            return InkWell(
                              onTap: () => _toggleSlot(slot),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFF0284C7).withValues(alpha: 0.4),
                                    width: isSelected ? 1.5 : 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (isSelected) ...[
                                      const Icon(Icons.check_rounded, size: 13, color: Colors.white),
                                      const SizedBox(width: 4),
                                    ],
                                    Text(
                                      slot,
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : const Color(0xFF38BDF8),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),

                        if (_selectedSlots.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${_selectedSlots.first} – ${int.parse(_selectedSlots.first.split(':').first) + _selectedSlots.length}:00',
                                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800),
                                      ),
                                      Text(
                                        '(${_selectedSlots.length} consecutive hour${_selectedSlots.length > 1 ? 's' : ''})',
                                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                                ElevatedButton(
                                  onPressed: _confirmSelectedSlots,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0284C7),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: Text('Continue with ${_selectedSlots.length} Slot${_selectedSlots.length > 1 ? 's' : ''} →'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],

                // Summary Card for Step 3 with Payment Verification
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

                        const Divider(color: Colors.white10, height: 20),

                        // Payment Method Choice
                        const Text(
                          '💳 Payment Verification',
                          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),

                        Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() { _paymentChoice = 'Card'; _paymentError = null; }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: _paymentChoice == 'Card' ? const Color(0xFF0284C7).withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.05),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: _paymentChoice == 'Card' ? const Color(0xFF0284C7) : Colors.white12,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.credit_card, size: 16, color: _paymentChoice == 'Card' ? const Color(0xFF38BDF8) : Colors.white70),
                                      const SizedBox(width: 6),
                                      Text('Card', style: TextStyle(color: _paymentChoice == 'Card' ? Colors.white : Colors.white70, fontSize: 12, fontWeight: FontWeight.w700)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() { _paymentChoice = 'BankTransfer'; _paymentError = null; }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: _paymentChoice == 'BankTransfer' ? const Color(0xFF0284C7).withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.05),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: _paymentChoice == 'BankTransfer' ? const Color(0xFF0284C7) : Colors.white12,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.account_balance, size: 16, color: _paymentChoice == 'BankTransfer' ? const Color(0xFF38BDF8) : Colors.white70),
                                      const SizedBox(width: 6),
                                      Text('Bank Slip', style: TextStyle(color: _paymentChoice == 'BankTransfer' ? Colors.white : Colors.white70, fontSize: 12, fontWeight: FontWeight.w700)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // If Card Payment
                        if (_paymentChoice == 'Card') ...[
                          if (_savedCards.isNotEmpty) ...[
                            Row(
                              children: [
                                _buildTabButton(
                                  label: 'Saved Cards (${_savedCards.length})',
                                  isSelected: _cardChoice == 'saved',
                                  onTap: () => setState(() => _cardChoice = 'saved'),
                                ),
                                const SizedBox(width: 8),
                                _buildTabButton(
                                  label: 'New Card',
                                  isSelected: _cardChoice == 'new',
                                  onTap: () => setState(() => _cardChoice = 'new'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                          ],

                          if (_cardChoice == 'saved' && _savedCards.isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white10),
                              ),
                              child: Column(
                                children: _savedCards.map((c) {
                                  final isSel = (_selectedSavedCardId ?? _savedCards.first.id) == c.id;
                                  return InkWell(
                                    onTap: () => setState(() => _selectedSavedCardId = c.id),
                                    child: Container(
                                      margin: const EdgeInsets.only(bottom: 6),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: isSel ? const Color(0xFF0284C7).withValues(alpha: 0.2) : Colors.transparent,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: isSel ? const Color(0xFF38BDF8) : Colors.transparent),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(isSel ? Icons.radio_button_checked : Icons.radio_button_off, size: 16, color: const Color(0xFF38BDF8)),
                                          const SizedBox(width: 8),
                                          Text(c.brand, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)),
                                          const SizedBox(width: 8),
                                          Text('•••• ${c.lastFour}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                                          const Spacer(),
                                          Text('${c.expiryMonth}/${c.expiryYear}', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                            const SizedBox(height: 10),
                            // CVV Input (Exactly 3 digits)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                              ),
                              child: TextField(
                                controller: _savedCvvController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                obscureText: true,
                                maxLength: 3,
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                decoration: const InputDecoration(
                                  counterText: '',
                                  hintText: 'Enter 3-digit CVV *',
                                  hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  border: InputBorder.none,
                                  isDense: true,
                                  filled: false,
                                ),
                              ),
                            ),
                          ] else ...[
                            // New Card Fields (16-digit card, month 01-12 list, year next 10 years, 3-digit CVV)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.white12),
                              ),
                              child: TextField(
                                controller: _cardNumberController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                maxLength: 16,
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                decoration: const InputDecoration(
                                  counterText: '',
                                  hintText: 'Card Number (16 digits) *',
                                  hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  border: InputBorder.none,
                                  isDense: true,
                                  filled: false,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                // Month Dropdown (01 - 12)
                                Expanded(
                                  flex: 3,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.white12),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedExpiryMonth,
                                        dropdownColor: const Color(0xFF0F172A),
                                        icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF38BDF8), size: 18),
                                        isExpanded: true,
                                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                        items: _monthsList.map((m) {
                                          return DropdownMenuItem<String>(
                                            value: m,
                                            child: Text('MM: $m'),
                                          );
                                        }).toList(),
                                        onChanged: (val) {
                                          if (val != null) setState(() => _selectedExpiryMonth = val);
                                        },
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Year Dropdown (Next 10 years)
                                Expanded(
                                  flex: 4,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.white12),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedExpiryYear,
                                        dropdownColor: const Color(0xFF0F172A),
                                        icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF38BDF8), size: 18),
                                        isExpanded: true,
                                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                        items: _yearsList.map((y) {
                                          return DropdownMenuItem<String>(
                                            value: y,
                                            child: Text('YYYY: $y'),
                                          );
                                        }).toList(),
                                        onChanged: (val) {
                                          if (val != null) setState(() => _selectedExpiryYear = val);
                                        },
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // CVV (3 digits)
                                Expanded(
                                  flex: 3,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.white12),
                                    ),
                                    child: TextField(
                                      controller: _newCvvController,
                                      keyboardType: TextInputType.number,
                                      inputFormatters: [
                                        FilteringTextInputFormatter.digitsOnly,
                                      ],
                                      obscureText: true,
                                      maxLength: 3,
                                      style: const TextStyle(color: Colors.white, fontSize: 13),
                                      decoration: const InputDecoration(
                                        counterText: '',
                                        hintText: 'CVV *',
                                        hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                        border: InputBorder.none,
                                        isDense: true,
                                        filled: false,
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            CheckboxListTile(
                              value: _saveCardDetails,
                              onChanged: (val) => setState(() => _saveCardDetails = val ?? true),
                              title: const Text('Save card securely for future fast bookings', style: TextStyle(color: Colors.white70, fontSize: 11)),
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              activeColor: const Color(0xFF0284C7),
                            ),
                          ],
                        ] else ...[
                          // Bank Transfer Slip Upload (Supports Flutter Web via Image.memory)
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white10),
                            ),
                            child: const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Bank: Commercial Bank of Ceylon', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                SizedBox(height: 2),
                                Text('Account: 1000 8923 7412 (Colombo 07)', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_selectedBankSlip != null && _selectedBankSlipBytes != null) ...[
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF065F46).withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFF10B981)),
                              ),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: Image.memory(
                                      _selectedBankSlipBytes!,
                                      width: 36,
                                      height: 36,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _selectedBankSlipName ?? _selectedBankSlip!.name,
                                      style: const TextStyle(color: Color(0xFFA7F3D0), fontSize: 11, fontWeight: FontWeight.w600),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, size: 16, color: Colors.white70),
                                    onPressed: () => setState(() {
                                      _selectedBankSlip = null;
                                      _selectedBankSlipBytes = null;
                                      _selectedBankSlipName = null;
                                    }),
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            OutlinedButton.icon(
                              onPressed: _pickBankSlipImage,
                              icon: const Icon(Icons.upload_file, size: 16),
                              label: const Text('Upload Transfer Slip / Receipt *'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF38BDF8),
                                side: const BorderSide(color: Color(0xFF38BDF8)),
                                minimumSize: const Size(double.infinity, 38),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ],
                        ],

                        if (_paymentError != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF7F1D1D).withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFEF4444)),
                            ),
                            child: Text(
                              '⚠️ $_paymentError',
                              style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],

                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _isLoading ? null : _confirmBooking,
                          icon: const Icon(Icons.check_circle_rounded, size: 18),
                          label: const Text('Validate & Confirm Booking'),
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

                // Quick facility / suggestion options (High contrast dark theme-proof chips)
                if (_suggestedOptions.isNotEmpty && _confirmedBooking == null) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _suggestedOptions.map((opt) {
                      return _buildQuickChip(
                        label: opt,
                        onTap: () => _sendMessage(opt),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),

          // Input Bar or Confirmation Complete (Fix white-on-white text bug)
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
                        cursorColor: const Color(0xFF38BDF8),
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          isDense: true,
                          filled: true,
                          fillColor: Color(0xFF1E293B),
                          hintText: 'e.g. Badminton tomorrow at 7 PM for 2 hours',
                          hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
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
