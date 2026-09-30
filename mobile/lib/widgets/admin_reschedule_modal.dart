import 'package:flutter/material.dart';
import '../models/booking.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AdminRescheduleModal extends StatefulWidget {
  final Booking booking;
  final VoidCallback onRequested;

  const AdminRescheduleModal({super.key, required this.booking, required this.onRequested});

  static Future<void> show(BuildContext context, Booking booking, VoidCallback onRequested) {
    return showDialog(
      context: context,
      builder: (ctx) => AdminRescheduleModal(booking: booking, onRequested: onRequested),
    );
  }

  @override
  State<AdminRescheduleModal> createState() => _AdminRescheduleModalState();
}

class _AdminRescheduleModalState extends State<AdminRescheduleModal> {
  final ApiService _apiService = ApiService();
  final TextEditingController _reasonController = TextEditingController(
    text: 'Adverse weather impact - rain-check free reschedule offered by management.',
  );

  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _isSubmitting = true);
    try {
      await _apiService.requestReschedule(
        widget.booking.id,
        reason: _reasonController.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onRequested();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Free reschedule offer sent to member.')),
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
                    color: AppTheme.purpleBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.cloud_sync_rounded, color: AppTheme.purple, size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Offer Weather Reschedule',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.deepHeading),
                      ),
                      Text(
                        'Rain-check policy for outdoor venues',
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
            Text(
              'Booking #${widget.booking.id} • ${widget.booking.customerName}',
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.booking.facilityName} (${widget.booking.formattedDate} • ${widget.booking.formattedTimeSlot})',
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _reasonController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Reason for reschedule offer',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.purple),
              child: _isSubmitting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Send Reschedule Request to Member'),
            ),
          ],
        ),
      ),
    );
  }
}
