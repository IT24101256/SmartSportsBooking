import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/booking.dart';
import '../../models/facility.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ticket_qr_modal.dart';
import '../../widgets/user_cancel_modal.dart';
import '../../widgets/user_reschedule_modal.dart';
import '../../widgets/admin_reschedule_modal.dart';
import '../../widgets/admin_refund_modal.dart';
import '../../widgets/add_equipment_modal.dart';
import '../../widgets/review_modal.dart';
import '../../widgets/bank_slip_modal.dart';

class BookingsScreen extends StatefulWidget {
  final List<Booking> bookings;
  final List<Facility> facilities;
  final bool isLoading;
  final VoidCallback onRefresh;
  final VoidCallback onNewBooking;

  const BookingsScreen({
    super.key,
    required this.bookings,
    required this.facilities,
    required this.isLoading,
    required this.onRefresh,
    required this.onNewBooking,
  });

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  final ApiService _apiService = ApiService();

  String _selectedFilter = 'all'; // 'all', 'confirmed', 'pending', 'reschedule', 'to-refund', 'cancelled', 'expired'
  String _searchQuery = '';
  DateTime? _selectedDate;

  final List<Map<String, String>> _filterTabs = [
    {'id': 'all', 'label': 'All'},
    {'id': 'confirmed', 'label': 'Confirmed'},
    {'id': 'pending', 'label': 'Pending'},
    {'id': 'reschedule', 'label': 'Reschedule'},
    {'id': 'to-refund', 'label': 'To Refund'},
    {'id': 'cancelled', 'label': 'Cancelled'},
    {'id': 'expired', 'label': 'Expired'},
  ];

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'en_US');
    final dateFmt = DateFormat('yyyy-MM-dd');
    final user = _apiService.currentUser;
    final isStaff = user?.isStaffOrAdmin == true;
    final isAdmin = user?.isAdmin == true;

    // Filter computation
    final filtered = widget.bookings.where((b) {
      final expired = b.isExpired;

      if (_selectedFilter == 'expired') {
        if (!expired) return false;
      } else {
        if (expired) return false;
      }

      if (_selectedDate != null) {
        if (dateFmt.format(b.bookingDate) != dateFmt.format(_selectedDate!)) return false;
      }

      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final match = b.facilityName.toLowerCase().contains(q) ||
            b.customerName.toLowerCase().contains(q) ||
            b.id.toString().contains(q);
        if (!match) return false;
      }

      switch (_selectedFilter) {
        case 'confirmed':
          return b.isConfirmed;
        case 'pending':
          return b.isPending;
        case 'reschedule':
          return b.isRescheduleOffer;
        case 'to-refund':
          return b.isToRefund;
        case 'cancelled':
          return b.isCancelled;
        case 'expired':
        case 'all':
        default:
          return true;
      }
    }).toList();

    // Show the last booking at first (newest ID / most recently booked at top)
    final sorted = List<Booking>.from(filtered)
      ..sort((a, b) {
        if (b.id != a.id) {
          return b.id.compareTo(a.id);
        }
        return b.bookingDate.compareTo(a.bookingDate);
      });

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        children: [
          // Header with Book button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Bookings (${sorted.length})',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
              ),
              ElevatedButton.icon(
                onPressed: widget.onNewBooking,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Book Court'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Search bar
          TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Search by booking #, venue, or member...',
              prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textMuted),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () => setState(() => _searchQuery = ''))
                  : null,
            ),
          ),
          const SizedBox(height: 12),

          // Quick Filter Tabs Carousel
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _filterTabs.map((tab) {
                final isSelected = _selectedFilter == tab['id'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(tab['label']!),
                    selected: isSelected,
                    onSelected: (val) {
                      if (val) setState(() => _selectedFilter = tab['id']!);
                    },
                    selectedColor: AppTheme.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppTheme.deepHeading,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          if (sorted.isEmpty)
            Container(
              padding: const EdgeInsets.all(40),
              alignment: Alignment.center,
              child: Column(
                children: [
                  const Icon(Icons.calendar_today_outlined, size: 48, color: AppTheme.textMuted),
                  const SizedBox(height: 12),
                  const Text('No bookings found in this view.', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading)),
                  const SizedBox(height: 4),
                  const Text('Tap "Book Court" to make a new reservation.', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: widget.onNewBooking, child: const Text('Book Court Now')),
                ],
              ),
            )
          else
            ...sorted.map((b) {
              final fac = widget.facilities.where((f) => f.id == b.facilityId).isNotEmpty
                  ? widget.facilities.firstWhere((f) => f.id == b.facilityId)
                  : null;

              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: b.isRescheduleOffer
                        ? const Color(0xFFD8B4FE)
                        : (b.isToRefund ? const Color(0xFFFCA5A5) : AppTheme.border),
                    width: b.isRescheduleOffer || b.isToRefund ? 1.5 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 6)),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header: Gate Badge & Status
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                            child: Text(
                              b.gateName,
                              style: const TextStyle(color: Color(0xFFB45309), fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ),
                          _buildStatusBadge(b),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Venue & Date/Time
                      Text(
                        b.facilityName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${b.formattedDate} • ${b.formattedTimeSlot} (${b.hoursNeeded} hr)',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 10),

                      // Customer Info
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppTheme.scaffoldBg, borderRadius: BorderRadius.circular(14)),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Member: ${b.customerName}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.deepHeading)),
                                if (b.contactNumber.isNotEmpty)
                                  Text('Phone: ${b.contactNumber}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'LKR ${currencyFmt.format(b.totalAmount)}',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppTheme.primary),
                                ),
                                Text('${b.paymentMethod} (${b.paymentStatus})', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Equipment payments breakdown if any
                      if (b.equipmentPayments.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(12)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Extra Equipment Rented:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: AppTheme.primary)),
                              const SizedBox(height: 4),
                              ...b.equipmentPayments.map((ep) => Text(
                                    '• ${ep.equipmentName} ×${ep.quantity} (LKR ${currencyFmt.format(ep.totalAmount)} via ${ep.paymentMethod})',
                                    style: const TextStyle(fontSize: 11, color: AppTheme.primaryDark),
                                  )),
                            ],
                          ),
                        ),
                      ],

                      // Cancellation / Refund info banner if cancelled
                      if (b.isCancelled) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: b.refundPercentage != null && b.refundPercentage! > 0 ? AppTheme.warningBg : AppTheme.dangerBg,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                b.refundPercentage != null && b.refundPercentage! > 0
                                    ? 'Refund ${b.refundStatus ?? 'To Refund'}: LKR ${currencyFmt.format(b.refundAmount ?? 0)} (${b.refundPercentage}%)'
                                    : 'Non-refundable cancellation (<12h notice)',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                  color: b.refundPercentage != null && b.refundPercentage! > 0 ? AppTheme.warningDark : AppTheme.dangerDark,
                                ),
                              ),
                              if (b.cancellationReason != null && b.cancellationReason!.isNotEmpty)
                                Text('Reason: "${b.cancellationReason}"', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
                            ],
                          ),
                        ),
                      ],

                      // Reschedule request banner
                      if (b.isRescheduleOffer) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppTheme.purpleBg, borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              const Icon(Icons.cloud_sync, color: AppTheme.purple, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  b.rescheduleReason ?? 'Free rain-check reschedule offered by management.',
                                  style: const TextStyle(color: AppTheme.purple, fontWeight: FontWeight.w700, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const Divider(height: 24),

                      // Action Buttons Row
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          // 1. QR Gate Pass (Active sessions)
                          if (!b.isCancelled && !b.isExpired)
                            OutlinedButton.icon(
                              onPressed: () => TicketQrModal.show(context, b),
                              icon: const Icon(Icons.qr_code, size: 16),
                              label: const Text('Pass QR'),
                              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            ),

                          // 2. Free Reschedule (User accepts reschedule offer)
                          if (b.isRescheduleOffer)
                            ElevatedButton.icon(
                              onPressed: () => UserRescheduleModal.show(context, b, widget.onRefresh),
                              icon: const Icon(Icons.edit_calendar, size: 16),
                              label: const Text('Reschedule Slot (Free)'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.purple, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            ),

                          // 3. Admin: Offer weather reschedule
                          if (isStaff && !b.isCancelled && !b.isExpired && !b.isRescheduleOffer)
                            OutlinedButton.icon(
                              onPressed: () => AdminRescheduleModal.show(context, b, widget.onRefresh),
                              icon: const Icon(Icons.cloud_sync_outlined, size: 16, color: AppTheme.purple),
                              label: const Text('Weather Reschedule', style: TextStyle(color: AppTheme.purple)),
                              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            ),

                          // 4. Admin: Add on-site equipment rental
                          if (isStaff && !b.isCancelled && !b.isExpired)
                            OutlinedButton.icon(
                              onPressed: () => AddEquipmentModal.show(context, b, facility: fac, onAdded: widget.onRefresh),
                              icon: const Icon(Icons.sports_tennis, size: 16, color: Color(0xFFB45309)),
                              label: const Text('+ Equipment Rental', style: TextStyle(color: Color(0xFFB45309))),
                              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            ),

                          // 5. Admin: Confirm Refund
                          if (isStaff && b.isToRefund)
                            ElevatedButton.icon(
                              onPressed: () => AdminRefundModal.show(context, b, widget.onRefresh),
                              icon: const Icon(Icons.verified, size: 16),
                              label: const Text('Confirm Refund'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            ),

                          // 6. Bank Slip Verification & Viewer
                          if (b.paymentMethod == 'BankTransfer') ...[
                            if (isStaff && !b.isConfirmed && !b.isCancelled)
                              ElevatedButton.icon(
                                onPressed: () => BankSlipModal.show(context, b, widget.onRefresh),
                                icon: const Icon(Icons.verified_outlined, size: 16),
                                label: const Text('Verify Slip'),
                                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                              )
                            else if (b.bankSlipFileName != null && b.bankSlipFileName!.isNotEmpty)
                              OutlinedButton.icon(
                                onPressed: () => BankSlipModal.show(context, b, widget.onRefresh),
                                icon: const Icon(Icons.receipt_long_rounded, size: 16, color: AppTheme.primary),
                                label: const Text('View Slip', style: TextStyle(color: AppTheme.primary)),
                                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                              ),
                          ],

                          // 7. Member & Admin: Cancel with refund
                          if (!b.isCancelled && !b.isExpired)
                            OutlinedButton.icon(
                              onPressed: () => UserCancelModal.show(context, b, widget.onRefresh),
                              icon: const Icon(Icons.cancel_outlined, size: 16, color: AppTheme.danger),
                              label: const Text('Cancel', style: TextStyle(color: AppTheme.danger)),
                              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            ),

                          // 8. Member & Admin: Review Modal
                          if (!b.isCancelled) ...[
                            if (!isStaff)
                              OutlinedButton.icon(
                                onPressed: () => ReviewModal.show(context, booking: b, existingReview: b.review, onSaved: widget.onRefresh),
                                icon: const Icon(Icons.star_outline_rounded, size: 16, color: Color(0xFFF59E0B)),
                                label: Text(b.review != null ? 'Edit Review' : 'Rate & Review', style: const TextStyle(color: Color(0xFFB45309))),
                                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                              )
                            else if (isAdmin && b.review != null)
                              OutlinedButton.icon(
                                onPressed: () => ReviewModal.show(context, booking: b, existingReview: b.review, onSaved: widget.onRefresh),
                                icon: const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                                label: const Text('Manage Review', style: TextStyle(color: Color(0xFFB45309))),
                                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                              ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(Booking b) {
    Color bg = AppTheme.successBg;
    Color fg = AppTheme.successDark;
    String text = b.status;

    if (b.isExpired) {
      bg = const Color(0xFFF1F5F9);
      fg = const Color(0xFF64748B);
      text = 'Expired';
    } else if (b.isCancelled) {
      bg = AppTheme.dangerBg;
      fg = AppTheme.dangerDark;
      text = 'Cancelled';
    } else if (b.isRescheduleOffer) {
      bg = AppTheme.purpleBg;
      fg = AppTheme.purple;
      text = 'Reschedule Offered';
    } else if (b.isPending) {
      bg = AppTheme.warningBg;
      fg = AppTheme.warningDark;
      text = 'Pending';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 11)),
    );
  }
}
