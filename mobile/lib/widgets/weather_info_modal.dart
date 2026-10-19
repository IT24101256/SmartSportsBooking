import 'package:flutter/material.dart';
import '../models/booking.dart';
import '../models/weather.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'admin_reschedule_modal.dart';

class WeatherInfoModal extends StatelessWidget {
  final WeatherOverview overview;
  final List<Booking> bookings;
  final VoidCallback? onRefresh;

  const WeatherInfoModal({
    super.key,
    required this.overview,
    this.bookings = const [],
    this.onRefresh,
  });

  static Future<void> show(
    BuildContext context,
    WeatherOverview overview, {
    List<Booking> bookings = const [],
    VoidCallback? onRefresh,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WeatherInfoModal(
        overview: overview,
        bookings: bookings,
        onRefresh: onRefresh,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final current = overview.current;
    final daily = overview.dailyForecast;
    final alerts = overview.alerts;
    final isStaff = ApiService().currentUser?.isStaffOrAdmin == true;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.darkNavy,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'WEATHER MONITORING AGENT',
                          style: TextStyle(
                            color: Color(0xFF38BDF8),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Weather Intelligence & Forecast',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Current Weather Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Text(current.icon, style: const TextStyle(fontSize: 42)),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    current.temperature != null
                                        ? '${current.temperature!.round()}°C'
                                        : '28°C',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 26,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: current.isSuitableForPlay
                                          ? const Color(0xFF10B981).withValues(alpha: 0.2)
                                          : const Color(0xFFEF4444).withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: current.isSuitableForPlay
                                            ? const Color(0xFF10B981)
                                            : const Color(0xFFEF4444),
                                      ),
                                    ),
                                    child: Text(
                                      current.suitabilityMessage,
                                      style: TextStyle(
                                        color: current.isSuitableForPlay
                                            ? const Color(0xFF34D399)
                                            : const Color(0xFFF87171),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${current.locationName} • ${current.condition}',
                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(color: Colors.white12, height: 1),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildMetricCol('WIND SPEED', '${current.windSpeed?.round() ?? 10} km/h'),
                        _buildMetricCol('HUMIDITY', '${current.relativeHumidity ?? 75}%'),
                        _buildMetricCol('PROVIDER', 'Open-Meteo', valueColor: const Color(0xFF38BDF8)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 7-Day Day-by-Day Outlook
              if (daily.isNotEmpty) ...[
                const Text(
                  '7-DAY PLAYABILITY OUTLOOK',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 106,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: daily.length,
                    separatorBuilder: (_, index) => const SizedBox(width: 8),
                    itemBuilder: (ctx, idx) {
                      final day = daily[idx];
                      return Container(
                        width: 78,
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: day.isSuitableForPlay ? Colors.white10 : const Color(0xFFEF4444).withValues(alpha: 0.4),
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              day.dayName,
                              style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 4),
                            Text(day.icon, style: const TextStyle(fontSize: 20)),
                            const SizedBox(height: 4),
                            Text(
                              '${day.maxTemperature?.round() ?? 30}°',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800),
                            ),
                            if ((day.precipitationProbabilityMax ?? 0) > 0)
                              Text(
                                '${day.precipitationProbabilityMax!.round()}%',
                                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.w700),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Active Weather Risk Alerts
              Row(
                children: [
                  const Text(
                    'ACTIVE WEATHER RISK ALERTS',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(width: 6),
                  if (alerts.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${alerts.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              if (alerts.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.25)),
                  ),
                  child: const Row(
                    children: [
                      Text('✨', style: TextStyle(fontSize: 22)),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'No Weather Risk Alerts. All scheduled outdoor bookings are clear for play.',
                          style: TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: alerts.length,
                  separatorBuilder: (_, index) => const SizedBox(height: 10),
                  itemBuilder: (ctx, idx) {
                    final alert = alerts[idx];
                    final targetBooking = bookings.where((b) => b.id == alert.bookingId).firstOrNull;

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: alert.riskLevel == 'High'
                              ? const Color(0xFFEF4444).withValues(alpha: 0.4)
                              : const Color(0xFFF59E0B).withValues(alpha: 0.4),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      alert.facilityName,
                                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Pass #BK-${alert.bookingId.toString().padLeft(5, '0')} • ${alert.customerName}',
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    alert.formattedDate,
                                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w700),
                                  ),
                                  Text(
                                    alert.formattedTimeSlot,
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Warning reason
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: alert.riskLevel == 'High'
                                  ? const Color(0xFFEF4444).withValues(alpha: 0.12)
                                  : const Color(0xFFF59E0B).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Text(alert.riskLevel == 'High' ? '⛈️' : '🌧️', style: const TextStyle(fontSize: 14)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    alert.warningReason,
                                    style: TextStyle(
                                      color: alert.riskLevel == 'High' ? const Color(0xFFFCA5A5) : const Color(0xFFFDE68A),
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Admin Reschedule Action Button
                          if (isStaff) ...[
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (alert.isRescheduleOffered)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                                    ),
                                    child: const Text(
                                      '✓ Reschedule Offer Sent',
                                      style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w700),
                                    ),
                                  )
                                else
                                  ElevatedButton.icon(
                                    onPressed: () {
                                      final messenger = ScaffoldMessenger.of(context);
                                      Navigator.pop(context);
                                      if (targetBooking != null) {
                                        AdminRescheduleModal.show(context, targetBooking, () => onRefresh?.call());
                                      } else {
                                        // Directly send reschedule request via API
                                        ApiService()
                                            .requestReschedule(alert.bookingId, reason: 'Weather Advisory: ${alert.warningReason}')
                                            .then((_) {
                                          onRefresh?.call();
                                          messenger.showSnackBar(
                                            const SnackBar(content: Text('Free reschedule offer sent to member.')),
                                          );
                                        }).catchError((err) {
                                          messenger.showSnackBar(
                                            SnackBar(content: Text('Error: $err')),
                                          );
                                        });
                                      }
                                    },
                                    icon: const Icon(Icons.cloud_sync_outlined, size: 14),
                                    label: const Text('Offer Reschedule', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.purple,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCol(String label, String value, {Color valueColor = Colors.white}) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(color: valueColor, fontSize: 12, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }
}
