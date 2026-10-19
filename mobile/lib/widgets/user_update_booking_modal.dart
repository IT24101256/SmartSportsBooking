import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../models/facility.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class UserUpdateBookingModal extends StatefulWidget {
  final Booking booking;
  final VoidCallback onUpdated;

  const UserUpdateBookingModal({
    super.key,
    required this.booking,
    required this.onUpdated,
  });

  static Future<void> show(BuildContext context, Booking booking, VoidCallback onUpdated) {
    return showDialog(
      context: context,
      builder: (ctx) => UserUpdateBookingModal(booking: booking, onUpdated: onUpdated),
    );
  }

  @override
  State<UserUpdateBookingModal> createState() => _UserUpdateBookingModalState();
}

class _UserUpdateBookingModalState extends State<UserUpdateBookingModal> {
  final ApiService _apiService = ApiService();
  final NumberFormat _currencyFmt = NumberFormat('#,##0');

  List<Facility> _facilities = [];
  Facility? _selectedFacility;
  late DateTime _selectedDate;
  int _hoursNeeded = 1;
  String? _selectedStartTime;

  List<Map<String, dynamic>> _slots = [];
  bool _isLoadingFacilities = true;
  bool _isLoadingSlots = false;
  bool _isSubmitting = false;
  String? _error;

  // Payment method for upgrade
  final String _paymentMethod = 'Card';
  bool _useSavedCard = true;
  final TextEditingController _cardNumberCtrl = TextEditingController();
  final TextEditingController _expiryCtrl = TextEditingController();
  final TextEditingController _cvvCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _useSavedCard = widget.booking.cardLastFour != null || widget.booking.paymentMethod == 'Card';
    _hoursNeeded = widget.booking.hoursNeeded > 0 ? widget.booking.hoursNeeded : 1;
    final bDate = widget.booking.bookingDate;
    final now = DateTime.now();
    _selectedDate = bDate.isAfter(now) ? bDate : now;
    if (widget.booking.startTime.length >= 5) {
      _selectedStartTime = widget.booking.startTime.substring(0, 5);
    }
    _loadFacilities();
  }

  @override
  void dispose() {
    _cardNumberCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadFacilities() async {
    try {
      final facs = await _apiService.getFacilities();
      if (mounted) {
        setState(() {
          _facilities = facs;
          _isLoadingFacilities = false;
          _selectedFacility = facs.firstWhere(
            (f) => f.id == widget.booking.facilityId,
            orElse: () => facs.isNotEmpty
                ? facs.first
                : Facility(
                    id: widget.booking.facilityId,
                    name: widget.booking.facilityName,
                    type: 'Sport',
                    courtType: 'Indoor',
                    hourlyRate: 1000,
                    isAvailable: true,
                    isOccupiedNow: false,
                    status: 'Available',
                    description: '',
                    location: 'Main Complex',
                    contactNumber: '',
                    openingTime: '06:00',
                    closingTime: '23:00',
                    equipments: [],
                    images: [],
                    faq: [],
                    ratingCount: 0,
                  ),
          );
        });
        _loadSlots();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingFacilities = false;
          _error = 'Could not load facilities list.';
        });
      }
    }
  }

  Future<void> _loadSlots() async {
    if (_selectedFacility == null) return;
    setState(() {
      _isLoadingSlots = true;
      _error = null;
    });

    try {
      final res = await _apiService.getAvailability(_selectedFacility!.id, _selectedDate);
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
          _error = 'Could not load slots for selected date.';
        });
      }
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );

    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
      _loadSlots();
    }
  }

  double get _earlierPaid {
    final gross = widget.booking.totalAmount;
    final refunded = widget.booking.refundStatus == 'Refunded' ? (widget.booking.refundAmount ?? 0.0) : 0.0;
    return (gross - refunded).clamp(0.0, double.infinity);
  }

  double get _newTotal {
    final rate = _selectedFacility?.hourlyRate ?? 0.0;
    return rate * _hoursNeeded;
  }

  double get _priceDiff => _newTotal - _earlierPaid;

  bool _isSlotAvailable(String startTime) {
    final s = _slots.firstWhere(
      (slot) => slot['startTime']?.toString().startsWith(startTime) == true,
      orElse: () => {'status': 'Unavailable'},
    );
    return s['status']?.toString().toLowerCase() == 'available';
  }

  bool get _hasConflict {
    if (_selectedStartTime == null || _slots.isEmpty) return true;
    final startHour = int.tryParse(_selectedStartTime!.substring(0, 2)) ?? 8;
    if (startHour + _hoursNeeded > 24) return true;

    for (int i = 0; i < _hoursNeeded; i++) {
      final h = startHour + i;
      final prefix = '${h.toString().padLeft(2, '0')}:';
      if (!_isSlotAvailable(prefix)) return true;
    }
    return false;
  }

  Future<void> _handleConfirm() async {
    if (_selectedFacility == null || _selectedStartTime == null || _hasConflict) return;

    setState(() => _isSubmitting = true);
    try {
      final cleanNum = _cardNumberCtrl.text.replaceAll(' ', '');
      await _apiService.customerUpdateBooking(
        bookingId: widget.booking.id,
        facilityId: _selectedFacility!.id,
        newDate: _selectedDate,
        newStartTime: _selectedStartTime!,
        hoursNeeded: _hoursNeeded,
        paymentMethod: _priceDiff > 0 ? _paymentMethod : null,
        cardNumber: _priceDiff > 0 && _paymentMethod == 'Card' && !_useSavedCard ? cleanNum : null,
        cardLastFour: _priceDiff > 0 && _paymentMethod == 'Card'
            ? (_useSavedCard
                ? (widget.booking.cardLastFour ?? '4242')
                : (cleanNum.length >= 4 ? cleanNum.substring(cleanNum.length - 4) : '4242'))
            : null,
      );

      if (mounted) {
        Navigator.of(context).pop();
        widget.onUpdated();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _priceDiff > 0
                  ? 'Booking upgraded! Remaining LKR ${_currencyFmt.format(_priceDiff)} paid successfully.'
                  : _priceDiff < 0
                  ? 'Booking updated! Overpayment refund of LKR ${_currencyFmt.format(_priceDiff.abs())} queued for admin approval.'
                  : 'Booking updated successfully!',
            ),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('EEE, MMM d, yyyy');

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 680),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.edit_calendar, color: Color(0xFF059669), size: 22),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Update Booking', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading)),
                          Text('Pass #BK-${widget.booking.id.toString().padLeft(5, '0')}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppTheme.dangerBg, borderRadius: BorderRadius.circular(10)),
                  child: Text('⚠️ $_error', style: const TextStyle(color: AppTheme.dangerDark, fontSize: 12, fontWeight: FontWeight.w600)),
                ),

              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Facility Selector
                      const Text('1. Select Sports Facility', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                      const SizedBox(height: 6),
                      if (_isLoadingFacilities)
                        const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.border),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<Facility>(
                              isExpanded: true,
                              value: _selectedFacility,
                              items: _facilities.map((fac) {
                                return DropdownMenuItem<Facility>(
                                  value: fac,
                                  child: Text(
                                    '${fac.name} (LKR ${_currencyFmt.format(fac.hourlyRate)}/hr)',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _selectedFacility = val);
                                  _loadSlots();
                                }
                              },
                            ),
                          ),
                        ),
                      const SizedBox(height: 14),

                      // 2. Date & Duration Row
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('2. Date', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                                const SizedBox(height: 6),
                                InkWell(
                                  onTap: _pickDate,
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
                                    decoration: BoxDecoration(
                                      border: Border.all(color: AppTheme.border),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.calendar_today, size: 15, color: AppTheme.primary),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            dateFmt.format(_selectedDate),
                                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('3. Duration', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: AppTheme.border),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<int>(
                                      isExpanded: true,
                                      value: _hoursNeeded,
                                      items: [1, 2, 3, 4, 5, 6, 7, 8].map((h) {
                                        return DropdownMenuItem<int>(
                                          value: h,
                                          child: Text('$h ${h == 1 ? 'Hour' : 'Hours'}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                        );
                                      }).toList(),
                                      onChanged: (val) {
                                        if (val != null) setState(() => _hoursNeeded = val);
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // 3. Time Slots
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('4. Start Time Slot', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                          if (_isLoadingSlots) const Text('Checking slots...', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      if (_isLoadingSlots)
                        const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                      else
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: _slots.map((slot) {
                            final rawTime = slot['startTime']?.toString() ?? '08:00';
                            final sTime = rawTime.length >= 5 ? rawTime.substring(0, 5) : rawTime;
                            final isAvail = slot['status']?.toString().toLowerCase() == 'available';
                            final isSel = _selectedStartTime == sTime;

                            return ChoiceChip(
                              label: Text(sTime, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isSel ? Colors.white : isAvail ? AppTheme.deepHeading : AppTheme.textMuted)),
                              selected: isSel,
                              selectedColor: const Color(0xFF059669),
                              backgroundColor: isAvail ? Colors.white : Colors.grey.shade100,
                              onSelected: isAvail ? (selected) => setState(() => _selectedStartTime = selected ? sTime : null) : null,
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 16),

                      // 4. PRICE DIFFERENCE BREAKDOWN CARD
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _priceDiff > 0 ? const Color(0xFFF0FDF4) : _priceDiff < 0 ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: _priceDiff > 0 ? const Color(0xFFBBF7D0) : _priceDiff < 0 ? const Color(0xFFBFDBFE) : AppTheme.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('💰 Price Settlement', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _priceDiff > 0 ? const Color(0xFFDCFCE7) : _priceDiff < 0 ? const Color(0xFFDBEAFE) : Colors.grey.shade200,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    _priceDiff > 0 ? 'UPGRADE' : _priceDiff < 0 ? 'DOWNGRADE' : 'EQUAL',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 10,
                                      color: _priceDiff > 0 ? const Color(0xFF15803D) : _priceDiff < 0 ? const Color(0xFF1D4ED8) : AppTheme.textMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Earlier Paid Amount:', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                Text('LKR ${_currencyFmt.format(_earlierPaid)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('New Total (${_selectedFacility?.name ?? 'Court'} × $_hoursNeeded hrs):', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                Text('LKR ${_currencyFmt.format(_newTotal)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                              ],
                            ),
                            const Divider(height: 16),

                            if (_priceDiff > 0) ...[
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Deducted earlier paid:', style: TextStyle(fontSize: 12, color: Color(0xFF16A34A))),
                                  Text('- LKR ${_currencyFmt.format(_earlierPaid)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF16A34A))),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Remaining to Pay:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppTheme.deepHeading)),
                                  Text('LKR ${_currencyFmt.format(_priceDiff)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                                ],
                              ),
                            ] else if (_priceDiff < 0) ...[
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Overpayment to Refund:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppTheme.deepHeading)),
                                  Text('LKR ${_currencyFmt.format(_priceDiff.abs())}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF2563EB))),
                                ],
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'ℹ️ Admin will have a button to confirm this refund, which will be deducted from club revenue. No payment needed now.',
                                style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF)),
                              ),
                            ] else ...[
                              const Text('✓ Same total. No payment or refund needed.', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // If upgrade: Card info fields
                      if (_priceDiff > 0) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Card Settlement', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                            if (widget.booking.cardLastFour != null || widget.booking.paymentMethod == 'Card')
                              InkWell(
                                onTap: () => setState(() => _useSavedCard = !_useSavedCard),
                                child: Text(
                                  _useSavedCard ? '+ Use New Card' : 'Use Saved Card',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (_useSavedCard)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFF86EFAC)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.credit_card, color: Color(0xFF059669), size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Primary Card •••• ${widget.booking.cardLastFour ?? "4242"}',
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  '🔒 No CVV required. Verified card from earlier booking will be charged.',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                                ),
                              ],
                            ),
                          )
                        else ...[
                          TextField(
                            controller: _cardNumberCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'New Card Number', hintText: '1234 5678 9012 3456', border: OutlineInputBorder(), isDense: true),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _expiryCtrl,
                                  decoration: const InputDecoration(labelText: 'Exp MM/YY', hintText: '12/28', border: OutlineInputBorder(), isDense: true),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _cvvCtrl,
                                  obscureText: true,
                                  keyboardType: TextInputType.number,
                                  decoration: const InputDecoration(labelText: 'CVV', hintText: '123', border: OutlineInputBorder(), isDense: true),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: (_isSubmitting || _hasConflict || _selectedStartTime == null) ? null : _handleConfirm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(
                            _priceDiff > 0
                                ? 'Pay LKR ${_currencyFmt.format(_priceDiff)} & Update'
                                : _priceDiff < 0
                                ? 'Update & Request Refund'
                                : 'Confirm Update',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
