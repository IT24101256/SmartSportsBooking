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
          const SnackBar(content: Text('Refund verified and confirmed!')),
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
                    color: AppTheme.successBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.verified_outlined, color: AppTheme.success, size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Confirm Refund',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.deepHeading),
                      ),
                      Text(
                        'Record payment transfer to member',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
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
                color: AppTheme.scaffoldBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Booking #${widget.booking.id}',
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.deepHeading),
                      ),
                      Text(
                        'LKR ${currencyFmt.format(widget.booking.refundAmount ?? 0)} (${widget.booking.refundPercentage ?? 0}%)',
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.successDark, fontSize: 15),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Member: ${widget.booking.customerName}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  Text('Contact: ${widget.booking.contactNumber} • NIC: ${widget.booking.nicNumber}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  if (widget.booking.cancellationReason != null && widget.booking.cancellationReason!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('Reason: "${widget.booking.cancellationReason}"', style: const TextStyle(fontStyle: FontStyle.italic, color: Color(0xFF64748B), fontSize: 12)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Bank Transfer Ref / Transaction Notes',
                hintText: 'e.g. Ref #TXN88291 via Commercial Bank',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handleConfirm,
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success),
              child: _isSubmitting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Confirm & Mark as Refunded'),
            ),
          ],
        ),
      ),
    );
  }
}
