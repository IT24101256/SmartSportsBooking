import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class BankSlipModal extends StatefulWidget {
  final Booking booking;
  final VoidCallback onStatusUpdated;

  const BankSlipModal({
    super.key,
    required this.booking,
    required this.onStatusUpdated,
  });

  static Future<void> show(BuildContext context, Booking booking, VoidCallback onStatusUpdated) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BankSlipModal(booking: booking, onStatusUpdated: onStatusUpdated),
    );
  }

  @override
  State<BankSlipModal> createState() => _BankSlipModalState();
}

class _BankSlipModalState extends State<BankSlipModal> {
  final ApiService _apiService = ApiService();
  Uint8List? _slipBytes;
  bool _isLoading = true;
  String? _error;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _loadSlip();
  }

  Future<void> _loadSlip() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final bytes = await _apiService.getBankSlipBytes(widget.booking.id);
      if (mounted) {
        setState(() {
          _slipBytes = bytes;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  Future<void> _verifySlip() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 24),
            SizedBox(width: 8),
            Text('Verify Bank Transfer', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
          ],
        ),
        content: Text(
          'Confirm payment verification for Booking #${widget.booking.id} (${widget.booking.customerName}) for LKR ${NumberFormat('#,##0', 'en_US').format(widget.booking.totalAmount)}?\n\nThis will approve the payment and confirm the court reservation.',
          style: const TextStyle(fontSize: 13, color: AppTheme.deepHeading),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success),
            child: const Text('Approve & Confirm'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);
    try {
      await _apiService.updateBookingStatus(widget.booking.id, 'Confirmed');
      if (mounted) {
        Navigator.pop(context);
        widget.onStatusUpdated();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bank transfer verified! Booking #${widget.booking.id} is now Confirmed.'),
            backgroundColor: AppTheme.successDark,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to verify: ${e.toString().replaceAll('Exception: ', '')}')),
        );
      }
    }
  }

  Future<void> _rejectSlip() async {
    final reasonCtrl = TextEditingController(text: 'Invalid or illegible payment slip uploaded.');
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text('Reject Payment Slip', style: TextStyle(fontWeight: FontWeight.w900)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Enter reason for rejecting this payment transfer. The booking will be cancelled.',
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Rejection Reason', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Back')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Reject & Cancel'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);
    try {
      await _apiService.updateBookingStatus(
        widget.booking.id,
        'Cancelled',
        reason: reasonCtrl.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onStatusUpdated();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment slip rejected. Booking #${widget.booking.id} cancelled.'),
            backgroundColor: AppTheme.dangerDark,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to reject: ${e.toString().replaceAll('Exception: ', '')}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isStaff = _apiService.currentUser?.isStaffOrAdmin == true;
    final currencyFmt = NumberFormat('#,##0', 'en_US');
    final canVerify = isStaff && !widget.booking.isConfirmed && !widget.booking.isCancelled;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.92),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(10)),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('PAYMENT AUDIT', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: AppTheme.primary, letterSpacing: 0.5)),
                  Text('Bank Transfer Slip #${widget.booking.id}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading)),
                ],
              ),
              IconButton(icon: const Icon(Icons.close, color: AppTheme.textMuted), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 12),

          // Booking Metadata Chip
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.scaffoldBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.booking.customerName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.booking.facilityName} • ${widget.booking.startTime} - ${widget.booking.endTime}',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'LKR ${currencyFmt.format(widget.booking.totalAmount)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppTheme.primary),
                    ),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: widget.booking.isConfirmed ? AppTheme.successBg : AppTheme.warningBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        widget.booking.paymentStatus,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: widget.booking.isConfirmed ? AppTheme.successDark : AppTheme.warningDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Slip Image Preview Area
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Colors.white))
                    : _error != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.broken_image_outlined, color: Colors.white60, size: 48),
                                  const SizedBox(height: 10),
                                  Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                                  const SizedBox(height: 12),
                                  ElevatedButton.icon(
                                    onPressed: _loadSlip,
                                    icon: const Icon(Icons.refresh, size: 16),
                                    label: const Text('Retry Fetching Slip'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : _slipBytes != null
                            ? InteractiveViewer(
                                minScale: 0.5,
                                maxScale: 4.0,
                                child: Center(
                                  child: Image.memory(
                                    _slipBytes!,
                                    fit: BoxFit.contain,
                                    errorBuilder: (context, error, stackTrace) => const Center(
                                      child: Text(
                                        'Unable to display image preview (non-image format or corrupted).',
                                        style: TextStyle(color: Colors.white70, fontSize: 12),
                                      ),
                                    ),
                                  ),
                                ),
                              )
                            : const Center(
                                child: Text('No slip file uploaded for this booking.', style: TextStyle(color: Colors.white70)),
                              ),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Action Buttons Footer
          if (canVerify) ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isProcessing ? null : _rejectSlip,
                    icon: const Icon(Icons.cancel_outlined, size: 18, color: AppTheme.danger),
                    label: const Text('Reject Slip', style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppTheme.danger),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing ? null : _verifySlip,
                    icon: _isProcessing
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.check_circle_rounded, size: 18),
                    label: const Text('Verify & Confirm Booking', style: TextStyle(fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.success,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Close Preview', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ],
      ),
    );
  }
}
