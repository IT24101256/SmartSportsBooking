import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class UserRescheduleModal extends StatefulWidget {
  final Booking booking;
  final VoidCallback onRescheduled;

  const UserRescheduleModal({super.key, required this.booking, required this.onRescheduled});

  static Future<void> show(BuildContext context, Booking booking, VoidCallback onRescheduled) {
    return showDialog(
      context: context,
      builder: (ctx) => UserRescheduleModal(booking: booking, onRescheduled: onRescheduled),
    );
  }

  @override
  State<UserRescheduleModal> createState() => _UserRescheduleModalState();
}

class _UserRescheduleModalState extends State<UserRescheduleModal> {
  final ApiService _apiService = ApiService();

  late DateTime _selectedDate;
  String? _selectedStartTime;
  List<Map<String, dynamic>> _slots = [];
  bool _isLoadingSlots = false;
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Default to tomorrow or next day
    final now = DateTime.now();
    _selectedDate = now.add(const Duration(days: 1));
    _loadSlots();
  }

  Future<void> _loadSlots() async {
    setState(() {
      _isLoadingSlots = true;
      _selectedStartTime = null;
      _error = null;
    });

    try {
      final res = await _apiService.getAvailability(widget.booking.facilityId, _selectedDate);
      final rawSlots = res['slots'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _slots = rawSlots.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _isLoadingSlots = false;
        });
      }
    } catch (e) {
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

  Future<void> _handleConfirm() async {
    if (_selectedStartTime == null) return;

    final startHour = int.tryParse(_selectedStartTime!.substring(0, 2)) ?? 8;
    final endHour = startHour + widget.booking.hoursNeeded;
    final endStr = '${endHour.toString().padLeft(2, '0')}:00:00';

    setState(() => _isSubmitting = true);
    try {
      await _apiService.rescheduleBooking(
        bookingId: widget.booking.id,
        newDate: _selectedDate,
        newStartTime: _selectedStartTime!,
        newEndTime: endStr,
      );

      if (mounted) {
        Navigator.pop(context);
        widget.onRescheduled();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session rescheduled successfully! (No fee)')),
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 680),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.purpleBg,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.event_repeat_rounded, color: AppTheme.purple, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Reschedule Session',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.deepHeading),
                        ),
                        Text(
                          'Pick a new slot for free (${widget.booking.hoursNeeded} hr session)',
                          style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppTheme.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              if (widget.booking.isRescheduleOffer)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3E8FF),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFD8B4FE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.cloud_sync_rounded, color: AppTheme.purple, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          widget.booking.rescheduleReason ?? 'Free weather reschedule offered by management.',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF6B21A8), fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              // Date Picker Button
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.border),
                    borderRadius: BorderRadius.circular(14),
                    color: AppTheme.scaffoldBg,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 18, color: AppTheme.primary),
                          const SizedBox(width: 10),
                          Text(
                            dateFmt.format(_selectedDate),
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading),
                          ),
                        ],
                      ),
                      const Text('Change', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              const Text('Available Time Slots:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.deepHeading)),
              const SizedBox(height: 8),

              // Slots list / grid
              Expanded(
                child: _isLoadingSlots
                    ? const Center(child: CircularProgressIndicator())
                    : _slots.isEmpty
                        ? const Center(child: Text('No slots available for this date.', style: TextStyle(color: AppTheme.textMuted)))
                        : GridView.builder(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                              childAspectRatio: 2.2,
                            ),
                            itemCount: _slots.length,
                            itemBuilder: (context, index) {
                              final slot = _slots[index];
                              final timeStr = (slot['startTime']?.toString() ?? '').substring(0, 5);
                              final status = slot['status']?.toString() ?? 'Available';
                              final isAvailable = status.toLowerCase() == 'available';
                              final isSelected = _selectedStartTime == '$timeStr:00';

                              return InkWell(
                                onTap: isAvailable
                                    ? () => setState(() => _selectedStartTime = '$timeStr:00')
                                    : null,
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppTheme.primary
                                        : (isAvailable ? Colors.white : const Color(0xFFF1F5F9)),
                                    border: Border.all(
                                      color: isSelected
                                          ? AppTheme.primary
                                          : (isAvailable ? AppTheme.border : Colors.transparent),
                                    ),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    timeStr,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                      color: isSelected
                                          ? Colors.white
                                          : (isAvailable ? AppTheme.deepHeading : const Color(0xFF94A3B8)),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
              ],

              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: _selectedStartTime == null || _isSubmitting ? null : _handleConfirm,
                child: _isSubmitting
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_selectedStartTime != null ? 'Confirm New Slot (${_selectedStartTime!.substring(0, 5)})' : 'Select a Slot'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
