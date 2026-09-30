import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class UserCancelModal extends StatefulWidget {
  final Booking booking;
  final VoidCallback onCancelled;

  const UserCancelModal({super.key, required this.booking, required this.onCancelled});

  static Future<void> show(BuildContext context, Booking booking, VoidCallback onCancelled) {
    return showDialog(
      context: context,
      builder: (ctx) => UserCancelModal(booking: booking, onCancelled: onCancelled),
    );
  }

  @override
  State<UserCancelModal> createState() => _UserCancelModalState();
}

class _UserCancelModalState extends State<UserCancelModal> {
  final ApiService _apiService = ApiService();
  final TextEditingController _reasonController = TextEditingController();

  CancellationQuote? _quote;
  bool _isLoadingQuote = true;
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchQuote();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _fetchQuote() async {
    try {
      final q = await _apiService.getCancellationQuote(widget.booking.id);
      if (mounted) {
        setState(() {
          _quote = q;
          _isLoadingQuote = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingQuote = false;
          _error = 'Unable to calculate refund quote.';
        });
      }
    }
  }

  Future<void> _handleCancel() async {
    setState(() => _isSubmitting = true);
    try {
      await _apiService.cancelBookingWithRefund(
        widget.booking.id,
        reason: _reasonController.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onCancelled();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking cancelled successfully.')),
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
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: SingleChildScrollView(
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
                    color: AppTheme.dangerBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.cancel_outlined, color: AppTheme.danger, size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cancel Booking',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.deepHeading,
                        ),
                      ),
                      Text(
                        'Review refund policy & confirm',
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

            // Booking summary pill
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.scaffoldBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.booking.facilityName,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.deepHeading),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${widget.booking.formattedDate} • ${widget.booking.formattedTimeSlot}',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Booking Total: LKR ${currencyFmt.format(widget.booking.totalAmount)}',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary, fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Policy quote box
            if (_isLoadingQuote)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_quote != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _quote!.refundPercentage > 0 ? AppTheme.successBg : AppTheme.dangerBg,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _quote!.policyTier,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: _quote!.refundPercentage > 0 ? AppTheme.successDark : AppTheme.dangerDark,
                            fontSize: 14,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${_quote!.refundPercentage}% Refund',
                            style: TextStyle(
                              color: _quote!.refundPercentage > 0 ? AppTheme.successDark : AppTheme.dangerDark,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Estimated Refund: LKR ${currencyFmt.format(_quote!.refundAmount)}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: _quote!.refundPercentage > 0 ? AppTheme.successDark : AppTheme.dangerDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _quote!.policyExplanation,
                      style: TextStyle(
                        fontSize: 12,
                        color: _quote!.refundPercentage > 0 ? AppTheme.successDark.withValues(alpha: 0.85) : AppTheme.dangerDark.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: const TextStyle(color: AppTheme.danger, fontSize: 12),
              ),
            ],

            const SizedBox(height: 16),
            TextField(
              controller: _reasonController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Reason for cancellation (optional)',
                hintText: 'e.g. Schedule clash, unwell, rainy day',
              ),
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                    child: const Text('Keep Booking'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleCancel,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.danger,
                      foregroundColor: Colors.white,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Confirm Cancel'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
