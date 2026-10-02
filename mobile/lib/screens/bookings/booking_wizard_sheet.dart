import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../../models/facility.dart';
import '../../services/api_service.dart';
import '../../services/saved_cards_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/facility_images.dart';

class BookingWizardSheet extends StatefulWidget {
  final List<Facility> facilities;
  final Facility? initialFacility;
  final VoidCallback onBookingCreated;

  const BookingWizardSheet({
    super.key,
    required this.facilities,
    this.initialFacility,
    required this.onBookingCreated,
  });

  static Future<void> show(BuildContext context, {required List<Facility> facilities, Facility? initialFacility, required VoidCallback onBookingCreated}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookingWizardSheet(
        facilities: facilities,
        initialFacility: initialFacility,
        onBookingCreated: onBookingCreated,
      ),
    );
  }

  @override
  State<BookingWizardSheet> createState() => _BookingWizardSheetState();
}

class _BookingWizardSheetState extends State<BookingWizardSheet> {
  final ApiService _apiService = ApiService();
  final SavedCardsService _cardsService = SavedCardsService();
  final ImagePicker _picker = ImagePicker();

  int _step = 1; // 1: Venue & Slot, 2: Contact Info, 3: Payment
  late Facility _selectedFacility;
  late DateTime _selectedDate;
  String? _selectedStartTime;
  int _hoursNeeded = 1;

  List<Map<String, dynamic>> _slots = [];
  bool _isLoadingSlots = false;

  // Contact Info
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();
  final _nicController = TextEditingController();

  // Payment
  String _paymentMethod = 'Card'; // 'Card', 'BankTransfer', 'Cash'
  final _cardNumberController = TextEditingController();
  final _expiryMonthController = TextEditingController(text: '12');
  final _expiryYearController = TextEditingController(text: '2028');
  final _cvvController = TextEditingController(text: '123');
  XFile? _selectedBankSlip;
  bool _saveCardDetails = true;

  List<SavedCard> _savedCards = [];
  String? _selectedSavedCardId;

  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedFacility = widget.initialFacility ?? (widget.facilities.isNotEmpty ? widget.facilities.first : Facility(id: 1, name: 'Badminton Court', type: 'Badminton', hourlyRate: 1500, status: 'Available'));
    _selectedDate = DateTime.now();

    final user = _apiService.currentUser;
    if (user != null) {
      _nameController.text = user.fullName;
      _contactController.text = user.contactNumber;
      _nicController.text = user.nicNumber;
    }

    _loadSlots();
    _loadSavedCards();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _contactController.dispose();
    _nicController.dispose();
    _cardNumberController.dispose();
    _expiryMonthController.dispose();
    _expiryYearController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedCards() async {
    final cards = await _cardsService.getCards();
    if (mounted) {
      setState(() {
        _savedCards = cards;
        if (cards.isNotEmpty) {
          final defaultCard = cards.firstWhere((c) => c.isDefault, orElse: () => cards.first);
          _selectedSavedCardId = defaultCard.id;
          _applySavedCard(defaultCard);
        }
      });
    }
  }

  void _applySavedCard(SavedCard c) {
    _cardNumberController.text = '4242 •••• •••• ${c.lastFour}';
    _expiryMonthController.text = c.expiryMonth;
    _expiryYearController.text = c.expiryYear;
    _cvvController.clear();
    _cvvController.clear();
  }

  Future<void> _loadSlots() async {
    setState(() {
      _isLoadingSlots = true;
      _selectedStartTime = null;
      _errorMessage = null;
    });

    try {
      final res = await _apiService.getAvailability(_selectedFacility.id, _selectedDate);
      final rawSlots = res['slots'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _slots = rawSlots.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _isLoadingSlots = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingSlots = false;
          _errorMessage = 'Could not load slots for this date.';
        });
      }
    }
  }

  int _getMaxConsecutiveHours(String startStr) {
    final startHour = int.tryParse(startStr.substring(0, 2)) ?? 8;
    int consecutive = 0;
    for (int h = startHour; h < 24; h++) {
      final timePrefix = '${h.toString().padLeft(2, '0')}:';
      final slot = _slots.firstWhere(
        (s) => (s['startTime']?.toString() ?? '').startsWith(timePrefix),
        orElse: () => {},
      );
      if (slot.isEmpty || slot['status']?.toString().toLowerCase() != 'available') {
        break;
      }
      consecutive++;
    }
    return consecutive;
  }

  bool _isSlotInSelectedRange(String timeStr) {
    if (_selectedStartTime == null) return false;
    final startHour = int.tryParse(_selectedStartTime!.substring(0, 2)) ?? 8;
    final slotHour = int.tryParse(timeStr.substring(0, 2)) ?? -1;
    return slotHour >= startHour && slotHour < (startHour + _hoursNeeded);
  }

  double get _totalPrice => _selectedFacility.hourlyRate * _hoursNeeded;

  String get _calculatedEndTime {
    if (_selectedStartTime == null) return '09:00';
    final startHour = int.tryParse(_selectedStartTime!.substring(0, 2)) ?? 8;
    final endHour = startHour + _hoursNeeded;
    return '${endHour.toString().padLeft(2, '0')}:00';
  }

  Future<void> _pickBankSlip() async {
    try {
      final photo = await _picker.pickImage(source: ImageSource.gallery);
      if (photo != null) {
        setState(() => _selectedBankSlip = photo);
      }
    } catch (_) {}
  }

  void _nextStep() {
    setState(() => _errorMessage = null);
    if (_step == 1) {
      if (_selectedStartTime == null) {
        setState(() => _errorMessage = 'Please select a starting time slot.');
        return;
      }
      final maxConsec = _getMaxConsecutiveHours(_selectedStartTime!);
      if (_hoursNeeded > maxConsec) {
        setState(() => _errorMessage = 'Only $maxConsec consecutive hours are available from $_selectedStartTime.');
        return;
      }
      setState(() => _step = 2);
    } else if (_step == 2) {
      final name = _nameController.text.trim();
      final contact = _contactController.text.trim();
      final nic = _nicController.text.trim();

      if (name.isEmpty || contact.isEmpty || nic.isEmpty) {
        setState(() => _errorMessage = 'Please provide contact name, phone, and NIC.');
        return;
      }
      if (!RegExp(r'^\d{10}$').hasMatch(contact)) {
        setState(() => _errorMessage = 'Contact number must be exactly 10 digits.');
        return;
      }
      if (!RegExp(r'^(\d{9}[vVxX]|\d{12})$').hasMatch(nic)) {
        setState(() => _errorMessage = 'NIC must be 12 digits or 9 digits followed by V or X.');
        return;
      }
      setState(() => _step = 3);
    }
  }

  Future<void> _handleSubmitBooking() async {
    if (_paymentMethod == 'BankTransfer' && _selectedBankSlip == null) {
      setState(() => _errorMessage = 'Please upload a bank payment slip / receipt.');
      return;
    }

    if (_paymentMethod == 'Card') {
      final cardNum = _cardNumberController.text.replaceAll(' ', '');
      if (cardNum.length < 16 && !cardNum.contains('•••')) {
        setState(() => _errorMessage = 'Enter a valid 16-digit card number.');
        return;
      }
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await _apiService.createBooking(
        facilityId: _selectedFacility.id,
        bookingDate: _selectedDate,
        startTime: _selectedStartTime!,
        hoursNeeded: _hoursNeeded,
        paymentMethod: _paymentMethod,
        customerName: _nameController.text.trim(),
        contactNumber: _contactController.text.trim(),
        nicNumber: _nicController.text.trim(),
        cardNumber: _cardNumberController.text.replaceAll(' ', ''),
        expiryMonth: int.tryParse(_expiryMonthController.text.trim()) ?? 12,
        expiryYear: int.tryParse(_expiryYearController.text.trim()) ?? 2028,
        cvv: _cvvController.text.trim(),
        bankSlip: _selectedBankSlip,
      );

      // Save card details to local saved cards if requested
      if (_paymentMethod == 'Card' && _saveCardDetails) {
        final rawNum = _cardNumberController.text.replaceAll(' ', '');
        final last4 = rawNum.length >= 4 ? rawNum.substring(rawNum.length - 4) : '4242';
        await _cardsService.addCard(SavedCard(
          id: 'card_${DateTime.now().millisecondsSinceEpoch}',
          brand: rawNum.startsWith('5') ? 'Mastercard' : 'Visa',
          lastFour: last4,
          cardholderName: _nameController.text.trim().isNotEmpty ? _nameController.text.trim() : 'Athlete Card',
          expiryMonth: _expiryMonthController.text.trim(),
          expiryYear: _expiryYearController.text.trim(),
          isDefault: true,
        ));
      }

      if (mounted) {
        Navigator.pop(context);
        widget.onBookingCreated();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking confirmed successfully! Access pass issued.')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'en_US');
    final dateFmt = DateFormat('EEE, MMM d, yyyy');
    final maxConsecutive = _selectedStartTime != null ? _getMaxConsecutiveHours(_selectedStartTime!) : 16;
    final isStaff = _apiService.currentUser?.isManagerOrAdmin == true;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.90),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle bar
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(10)),
            ),
          ),
          const SizedBox(height: 14),

          // Wizard Header & Stepper
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('STEP $_step OF 3', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: AppTheme.primary, letterSpacing: 0.5)),
                  Text(
                    _step == 1
                        ? 'Select Venue & Time'
                        : (_step == 2 ? 'Customer Details' : 'Payment & Confirmation'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: AppTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppTheme.dangerBg, borderRadius: BorderRadius.circular(12)),
              child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.dangerDark, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 10),
          ],

          // Scrollable Form Body (PREVENTS 48PX OVERFLOW)
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // STEP 1: Venue, Date & Linear Slot Selection
                  if (_step == 1) ...[
                    // Facility preview thumbnail and dropdown
                    Row(
                      children: [
                        FacilityImageWidget(
                          facility: _selectedFacility,
                          width: 50,
                          height: 50,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            initialValue: _selectedFacility.id,
                            isExpanded: true,
                            decoration: const InputDecoration(labelText: 'Select Facility / Court', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12)),
                            items: widget.facilities.map((fac) {
                              return DropdownMenuItem<int>(
                                value: fac.id,
                                child: Text('${fac.name} (${fac.type}) - LKR ${currencyFmt.format(fac.hourlyRate)}/h', overflow: TextOverflow.ellipsis),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedFacility = widget.facilities.firstWhere((f) => f.id == val);
                                });
                                _loadSlots();
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Date Picker Button
                    InkWell(
                      onTap: () async {
                        final now = DateTime.now();
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: now,
                          lastDate: now.add(const Duration(days: 60)),
                        );
                        if (picked != null) {
                          setState(() => _selectedDate = picked);
                          _loadSlots();
                        }
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(border: Border.all(color: AppTheme.border), borderRadius: BorderRadius.circular(14), color: AppTheme.scaffoldBg),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.calendar_today_rounded, size: 18, color: AppTheme.primary),
                                const SizedBox(width: 10),
                                Text(dateFmt.format(_selectedDate), style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading)),
                              ],
                            ),
                            const Text('Change Date', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Duration selector with Linear Max Indicator
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Duration Needed:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.deepHeading)),
                            if (_selectedStartTime != null)
                              Text('Max available: $maxConsecutive hr${maxConsecutive > 1 ? 's' : ''}', style: const TextStyle(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              onPressed: _hoursNeeded > 1 ? () => setState(() => _hoursNeeded--) : null,
                              icon: const Icon(Icons.remove_circle_outline),
                              visualDensity: VisualDensity.compact,
                            ),
                            Text('$_hoursNeeded Hour${_hoursNeeded > 1 ? 's' : ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                            IconButton(
                              onPressed: _hoursNeeded < maxConsecutive ? () => setState(() => _hoursNeeded++) : null,
                              icon: const Icon(Icons.add_circle_outline),
                              visualDensity: VisualDensity.compact,
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Slot Legend
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Select Time Slot:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.deepHeading)),
                        Row(
                          children: [
                            _legendDot(const Color(0xFF22C55E), 'Available'),
                            const SizedBox(width: 8),
                            _legendDot(const Color(0xFFEF4444), 'Booked'),
                            const SizedBox(width: 8),
                            _legendDot(const Color(0xFF94A3B8), 'Past'),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Slots Grid
                    if (_isLoadingSlots)
                      const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
                    else
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                          childAspectRatio: 2.1,
                        ),
                        itemCount: _slots.length,
                        itemBuilder: (context, index) {
                          final slot = _slots[index];
                          final timeStr = (slot['startTime']?.toString() ?? '').substring(0, 5);
                          final status = slot['status']?.toString() ?? 'Available';
                          final isAvailable = status.toLowerCase() == 'available';
                          final isPast = status.toLowerCase() == 'past';
                          final isBooked = status.toLowerCase() == 'booked';
                          final isSelected = _isSlotInSelectedRange(timeStr);
                          final isStart = _selectedStartTime == '$timeStr:00';

                          Color bgColor = Colors.white;
                          Color borderColor = AppTheme.border;
                          Color textColor = AppTheme.deepHeading;

                          if (isSelected) {
                            bgColor = AppTheme.primary;
                            borderColor = AppTheme.primary;
                            textColor = Colors.white;
                          } else if (isBooked) {
                            bgColor = const Color(0xFFFEF2F2);
                            borderColor = const Color(0xFFFECACA);
                            textColor = const Color(0xFFDC2626);
                          } else if (isPast) {
                            bgColor = const Color(0xFFF1F5F9);
                            borderColor = const Color(0xFFE2E8F0);
                            textColor = const Color(0xFF94A3B8);
                          }

                          return InkWell(
                            onTap: isAvailable ? () {
                              setState(() {
                                _selectedStartTime = '$timeStr:00';
                                final maxAvail = _getMaxConsecutiveHours('$timeStr:00');
                                if (_hoursNeeded > maxAvail) {
                                  _hoursNeeded = maxAvail > 0 ? maxAvail : 1;
                                }
                              });
                            } : null,
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              decoration: BoxDecoration(
                                color: bgColor,
                                border: Border.all(color: borderColor, width: isStart ? 2 : 1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    timeStr,
                                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: textColor),
                                  ),
                                  Text(
                                    isSelected ? (isStart ? 'Starts' : 'Included') : status,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                      color: isSelected ? Colors.white.withValues(alpha: 0.85) : (isAvailable ? const Color(0xFF16A34A) : textColor),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ]

                  // STEP 2: Customer Details
                  else if (_step == 2) ...[
                    TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Member / Customer Full Name', prefixIcon: Icon(Icons.person_outline), border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 14),

                    TextField(
                      controller: _contactController,
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(labelText: 'Contact Phone Number (10 digits)', prefixIcon: Icon(Icons.phone_outlined), border: OutlineInputBorder(), counterText: ''),
                    ),
                    const SizedBox(height: 14),

                    TextField(
                      controller: _nicController,
                      maxLength: 12,
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9vVxX]'))],
                      decoration: const InputDecoration(labelText: 'National Identity Card (NIC)', prefixIcon: Icon(Icons.badge_outlined), border: OutlineInputBorder(), counterText: ''),
                    ),
                    const SizedBox(height: 16),
                  ]

                  // STEP 3: Payment Method
                  else if (_step == 3) ...[
                    const Text('Select Payment Method:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.deepHeading)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.credit_card, size: 16), SizedBox(width: 4), Text('Card')]),
                            selected: _paymentMethod == 'Card',
                            onSelected: (_) => setState(() => _paymentMethod = 'Card'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ChoiceChip(
                            label: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.account_balance, size: 16), SizedBox(width: 4), Text('Bank')]),
                            selected: _paymentMethod == 'BankTransfer',
                            onSelected: (_) => setState(() => _paymentMethod = 'BankTransfer'),
                          ),
                        ),
                        if (isStaff) ...[
                          const SizedBox(width: 8),
                          Expanded(
                            child: ChoiceChip(
                              label: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.payments_outlined, size: 16), SizedBox(width: 4), Text('Cash')]),
                              selected: _paymentMethod == 'Cash',
                              onSelected: (_) => setState(() => _paymentMethod = 'Cash'),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (_paymentMethod == 'Card') ...[
                      // Quick Saved Cards selector
                      if (_savedCards.isNotEmpty) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Saved Payment Cards:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.textMuted)),
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  _selectedSavedCardId = null;
                                  _cardNumberController.clear();
                                  _expiryMonthController.text = '12';
                                  _expiryYearController.text = '2028';
                                  _cvvController.clear();
                                });
                              },
                              child: const Text('Use New Card', style: TextStyle(fontSize: 11)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: _savedCards.map((sc) {
                              final isSelected = _selectedSavedCardId == sc.id;
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text('${sc.brand} •••• ${sc.lastFour}'),
                                  selected: isSelected,
                                  onSelected: (val) {
                                    if (val) {
                                      setState(() {
                                        _selectedSavedCardId = sc.id;
                                        _applySavedCard(sc);
                                      });
                                    }
                                  },
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      TextField(
                        controller: _cardNumberController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Card Number', hintText: '4242 4242 4242 4242', prefixIcon: Icon(Icons.credit_card), border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _expiryMonthController,
                              keyboardType: TextInputType.number,
                              maxLength: 2,
                              decoration: const InputDecoration(labelText: 'MM', hintText: '12', border: OutlineInputBorder(), counterText: ''),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _expiryYearController,
                              keyboardType: TextInputType.number,
                              maxLength: 4,
                              decoration: const InputDecoration(labelText: 'YYYY', hintText: '2028', border: OutlineInputBorder(), counterText: ''),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _cvvController,
                              keyboardType: TextInputType.number,
                              maxLength: 3,
                              obscureText: true,
                              decoration: const InputDecoration(labelText: 'CVV', hintText: '123', border: OutlineInputBorder(), counterText: ''),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _saveCardDetails,
                        dense: true,
                        title: const Text('Save this card in settings for instant checkout', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        onChanged: (val) => setState(() => _saveCardDetails = val ?? true),
                      ),
                    ] else if (_paymentMethod == 'Cash') ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 20),
                                SizedBox(width: 8),
                                Text('Cash in Hand (Desk Collection)', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF065F46))),
                              ],
                            ),
                            SizedBox(height: 6),
                            Text(
                              'Authorized for Admin & Manager staff. Customer pays directly in cash at the counter. The booking will be marked as Paid and instantly Confirmed.',
                              style: TextStyle(color: Color(0xFF047857), fontSize: 12, height: 1.3),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: AppTheme.scaffoldBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bank of Ceylon (BOC)', style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                            Text('Account: 8901239841', style: TextStyle(fontWeight: FontWeight.w700)),
                            Text('Branch: Colombo Sports City', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: _pickBankSlip,
                        icon: const Icon(Icons.upload_file),
                        label: Text(_selectedBankSlip != null ? 'Slip Selected: ${_selectedBankSlip!.name}' : 'Upload Payment Slip Photo'),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Live Price Total Summary Strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.primaryBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${_selectedFacility.name} • $_hoursNeeded hr session', style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 11)),
                    Text(
                      'Total: LKR ${currencyFmt.format(_totalPrice)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.primary),
                    ),
                  ],
                ),
                if (_selectedStartTime != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                    child: Text(
                      '${_selectedStartTime!.substring(0, 5)} - $_calculatedEndTime',
                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Wizard Action Buttons
          Row(
            children: [
              if (_step > 1) ...[
                OutlinedButton(
                  onPressed: () => setState(() => _step--),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14)),
                  child: const Text('Back'),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : (_step < 3 ? _nextStep : _handleSubmitBooking),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: _isSubmitting
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_step < 3 ? 'Continue to Next Step' : 'Confirm & Pay LKR ${currencyFmt.format(_totalPrice)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String text) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 3),
        Text(text, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
