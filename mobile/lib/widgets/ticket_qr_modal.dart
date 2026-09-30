import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/booking.dart';
import '../theme/app_theme.dart';

class TicketQrModal extends StatelessWidget {
  final Booking booking;

  const TicketQrModal({super.key, required this.booking});

  static Future<void> show(BuildContext context, Booking booking) {
    return showDialog(
      context: context,
      builder: (ctx) => TicketQrModal(booking: booking),
    );
  }

  @override
  Widget build(BuildContext context) {
    final qrData = 'SMARTSPORTS-TICKET-${booking.id}-${booking.facilityId}-${booking.bookingDate.toIso8601String().split('T').first}-${booking.startTime}';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBg,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    'Gate Pass #${booking.id}',
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.textMuted),
                  onPressed: () => Navigator.pop(context),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              booking.facilityName,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.deepHeading,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                booking.gateName,
                style: const TextStyle(
                  color: Color(0xFFB45309),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // QR Code
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: QrImageView(
                data: qrData,
                version: QrVersions.auto,
                size: 190.0,
                backgroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 20),

            // Session details card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.scaffoldBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  _infoRow('Date', booking.formattedDate),
                  const SizedBox(height: 8),
                  _infoRow('Time Slot', booking.formattedTimeSlot),
                  const SizedBox(height: 8),
                  _infoRow('Member', booking.customerName),
                  const SizedBox(height: 8),
                  _infoRow('Payment', '${booking.paymentMethod} (${booking.paymentStatus})'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Show this QR code at the entrance turnstile or venue check-in desk.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
        ),
        Text(
          value,
          style: const TextStyle(
            color: AppTheme.deepHeading,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}
