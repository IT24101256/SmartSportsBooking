import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AdminRefundModal extends StatefulWidget {
  final Booking booking;
  final VoidCallback onConfirmed;

  const AdminRefundModal({super.key, required this.booking, required this.onConfirmed});

  static Future<void> show(BuildContext context, Booking booking, VoidCallback onConfirmed) {
    return showDialog(
      context: context,
      builder: (ctx) => AdminRefundModal(booking: booking, onConfirmed: onConfirmed),
    );
  }

  @override
  State<AdminRefundModal> createState() => _AdminRefundModalState();
}

class _AdminRefundModalState extends State<AdminRefundModal> {
  final ApiService _apiService = ApiService();
  final TextEditingController _notesController = TextEditingController();

  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleConfirm() async {
    setState(() => _isSubmitting = true);
    try {
      await _apiService.confirmRefund(
        widget.booking.id,
        notes: _notesController.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onConfirmed();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.booking.isRescheduleRefund
                  ? 'Reschedule refund verified and confirmed!'
                  : 'Refund verified and confirmed!',
            ),
            backgroundColor: widget.booking.isRescheduleRefund ? const Color(0xFF2563EB) : AppTheme.success,
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
    final currencyFmt = NumberFormat('#,##0', 'en_US');
    final b = widget.booking;
    final isReschedule = b.isRescheduleRefund;
    final isFull = b.isFullRefund;

    final primaryColor = isReschedule
        ? const Color(0xFF2563EB)
        : (isFull ? AppTheme.success : const Color(0xFFD97706));
    final iconBgColor = isReschedule
        ? const Color(0xFFEFF6FF)
        : (isFull ? AppTheme.successBg : const Color(0xFFFEF3C7));

    final String eyebrow = isReschedule
        ? 'Reschedule Refund Verification'
        : 'Management Refund Verification';

    final String title = isReschedule
        ? 'Verify & Confirm Reschedule Refund'
        : 'Verify & Confirm ${isFull ? 'Full Refund (100%)' : 'Half Refund (50%)'}';

    final String subtitle = isReschedule
        ? 'Process price difference refund to member'
        : 'Record cancellation refund transfer to member';

    final String pillText = isReschedule
        ? '🔄 Price Difference Refund'
        : (isFull ? '🟢 Full 100% Refund' : '🟡 Half 50% Refund');

    String adjustmentReason = (b.rescheduleReason != null && b.rescheduleReason!.isNotEmpty)
        ? b.rescheduleReason!
        : (b.refundNotes != null && b.refundNotes!.isNotEmpty)
            ? b.refundNotes!.split('(')[0].trim()
            : 'Booking rescheduled to lower priced slot';
    if (adjustmentReason.isEmpty) {
      adjustmentReason = 'Booking rescheduled to lower priced slot';
    }

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: iconBgColor,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isReschedule ? Icons.sync_alt_rounded : Icons.verified_outlined,
                    color: primaryColor,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        eyebrow.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: primaryColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.deepHeading,
                        ),
                      ),
                      Text(
                        subtitle,
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
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isReschedule ? const Color(0xFFF8FAFC) : AppTheme.scaffoldBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isReschedule ? const Color(0xFFBFDBFE) : AppTheme.border,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              b.facilityName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                                color: AppTheme.deepHeading,
                              ),
                            ),
                            Text(
                              'Pass #BK-${b.id.toString().padLeft(5, '0')} • Member: ${b.customerName}',
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                            if (b.contactNumber.isNotEmpty)
                              Text(
                                'Contact: ${b.contactNumber}',
                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                              ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'LKR ${currencyFmt.format(b.refundAmount ?? 0)}',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: primaryColor,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: iconBgColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              pillText,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: primaryColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isReschedule ? 'Original Paid Amount:' : 'Original Amount:',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                      Text(
                        'LKR ${currencyFmt.format(b.totalAmount)}',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ],
                  ),
                  if (isReschedule) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Refund Amount (Difference):',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                        ),
                        Text(
                          'LKR ${currencyFmt.format(b.refundAmount ?? 0)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF2563EB),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Adjustment Reason:',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            adjustmentReason,
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF334155),
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Cancellation Reason:',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            b.cancellationReason?.isNotEmpty == true
                                ? b.cancellationReason!
                                : 'Member requested cancellation.',
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              fontStyle: FontStyle.italic,
                              color: Color(0xFF64748B),
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Current Status:',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'To Refund (Pending Verification)',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFB45309),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Bank Transfer Ref / Transaction Notes (Optional)',
                hintText: 'e.g. Bank slip transfer TRX-99238, cash refund at reception, etc.',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handleConfirm,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      isReschedule ? 'Confirm & Release Refund' : 'Confirm & Mark as Refunded',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
