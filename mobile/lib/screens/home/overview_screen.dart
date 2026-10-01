import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/booking.dart';
import '../../models/facility.dart';
import '../../models/support.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/facility_images.dart';
import '../../widgets/ticket_qr_modal.dart';
import '../admin/revenue_screen.dart';

class OverviewScreen extends StatelessWidget {
  final List<Facility> facilities;
  final List<Booking> bookings;
  final List<SupportRequest> supportRequests;
  final List<Map<String, dynamic>> scheduleEvents;
  final Map<String, dynamic> dashboardStats;
  final List<BookingReviewItem> reviews;
  final bool isLoading;
  final VoidCallback onRefresh;
  final Function(int) onNavigateTab;
  final Function(Facility) onSelectFacility;
  final VoidCallback onOpenBookingWizard;
  final VoidCallback onOpenBookWithAi;

  const OverviewScreen({
    super.key,
    required this.facilities,
    required this.bookings,
    required this.supportRequests,
    required this.scheduleEvents,
    required this.dashboardStats,
    this.reviews = const [],
    required this.isLoading,
    required this.onRefresh,
    required this.onNavigateTab,
    required this.onSelectFacility,
    required this.onOpenBookingWizard,
    required this.onOpenBookWithAi,
  });

  Booking? get _nextGame {
    final confirmed = bookings.where((b) => b.isConfirmed && !b.isExpired).toList();
    if (confirmed.isEmpty) return null;
    confirmed.sort((a, b) => a.bookingDate.compareTo(b.bookingDate));
    return confirmed.first;
  }

  @override
  Widget build(BuildContext context) {
    final user = ApiService().currentUser;
    final currencyFmt = NumberFormat('#,##0', 'en_US');
    final nextSession = _nextGame;
    final isStaff = user?.isManagerOrAdmin == true;

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        children: [
          // Greeting & Hero Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.darkNavy, Color(0xFF1E3A8A), AppTheme.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: 0.25),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        user != null ? '${user.role.toUpperCase()} PORTAL' : 'SMARTSPORTS',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const Icon(Icons.bolt_rounded, color: Color(0xFFFBBF24)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Welcome, ${user?.fullName.isNotEmpty == true ? user!.fullName : 'Athlete'} 👋',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Premium turf and indoor court facilities with instant booking.',
                  style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 13, height: 1.3),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ElevatedButton.icon(
                      onPressed: onOpenBookWithAi,
                      icon: const Icon(Icons.auto_awesome_rounded, size: 16, color: Color(0xFFFBBF24)),
                      label: const Text('Book With AI', style: TextStyle(fontWeight: FontWeight.w800)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF4338CA),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: onOpenBookingWizard,
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text('Manual'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.4)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => onNavigateTab(2), // Facilities
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.4)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Venues'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Manager & Admin: Financial / Revenue Quick Access Banner
          if (isStaff) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF065F46), Color(0xFF047857), Color(0xFF0F766E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF047857).withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.insights_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Revenue & Financials',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Gross bookings, court vs equipment income',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RevenueScreen())),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF065F46),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('View', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
          ],

          // SECTION 1: BOOK YOUR NEXT GAME / NEXT UPCOMING GAME
          if (nextSession != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'YOUR NEXT GAME',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppTheme.primary, letterSpacing: 0.8),
                ),
                TextButton.icon(
                  onPressed: onOpenBookingWizard,
                  icon: const Icon(Icons.add, size: 14),
                  label: const Text('Book Another', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFF6EE7B7), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.success.withValues(alpha: 0.08),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.successBg,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.sports_rounded, color: AppTheme.successDark, size: 20),
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Confirmed Match',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                                  ),
                                  Text('Access gate ready', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: AppTheme.successDark, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => TicketQrModal.show(context, nextSession),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.qr_code_rounded, size: 16, color: AppTheme.primary),
                              SizedBox(width: 4),
                              Text('QR Pass', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              nextSession.facilityName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.deepHeading),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${nextSession.formattedDate} • ${nextSession.formattedTimeSlot}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          nextSession.gateName,
                          style: const TextStyle(color: Color(0xFFB45309), fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
          ] else ...[
            // PROMINENT "BOOK YOUR NEXT GAME" HERO SECTION
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFBAE6FD), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.06),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(9),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0F2FE),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.stadium_rounded, color: AppTheme.primary, size: 20),
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'BOOK YOUR NEXT GAME',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 14,
                                      color: AppTheme.deepHeading,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'No active bookings yet',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.successBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('Live Booking', style: TextStyle(color: AppTheme.successDark, fontSize: 10, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Ready for your next workout or team match? Pick an available court and secure your game pass in seconds.',
                    style: TextStyle(color: Color(0xFF475569), fontSize: 12.5, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: onOpenBookingWizard,
                          icon: const Icon(Icons.flash_on_rounded, size: 18),
                          label: const Text('Book Court Now', style: TextStyle(fontWeight: FontWeight.w800)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () => onNavigateTab(2),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('Browse Courts', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
          ],

          // Quick Stats Grid
          Row(
            children: [
              _statCard(
                label: 'Active Courts',
                value: facilities.length.toString(),
                color: AppTheme.success,
                icon: Icons.stadium_outlined,
              ),
              const SizedBox(width: 12),
              _statCard(
                label: 'My Bookings',
                value: bookings.length.toString(),
                color: AppTheme.primary,
                icon: Icons.calendar_month_outlined,
              ),
              const SizedBox(width: 12),
              _statCard(
                label: 'Satisfaction',
                value: dashboardStats['memberSatisfaction']?.toString() ?? '98%',
                color: const Color(0xFFF59E0B),
                icon: Icons.thumb_up_alt_outlined,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Available Facilities Section (WITH REAL IMAGES)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Available Facilities',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
              ),
              TextButton(
                onPressed: () => onNavigateTab(2), // Facilities tab
                child: const Text('View All', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (facilities.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.center,
              child: const Text('Loading facilities...', style: TextStyle(color: AppTheme.textMuted)),
            )
          else
            SizedBox(
              height: 235,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: facilities.take(6).length,
                separatorBuilder: (context, index) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final f = facilities[index];
                  return InkWell(
                    onTap: () => onSelectFacility(f),
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      width: 220,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppTheme.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Facility Image Header
                          Stack(
                            children: [
                              SizedBox(
                                height: 110,
                                width: 220,
                                child: FacilityImageWidget(
                                  facility: f,
                                  width: 220,
                                  height: 110,
                                  fit: BoxFit.cover,
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
                                ),
                              ),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: f.isAvailable ? Colors.white.withValues(alpha: 0.95) : const Color(0xFFFEE2E2),
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4),
                                    ],
                                  ),
                                  child: Text(
                                    f.status,
                                    style: TextStyle(
                                      color: f.isAvailable ? AppTheme.successDark : AppTheme.dangerDark,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 8,
                                left: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    f.courtType,
                                    style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  f.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${f.type} • ${f.location}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'LKR ${currencyFmt.format(f.hourlyRate)}/h',
                                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary, fontSize: 13),
                                    ),
                                    if (f.rating != null)
                                      Row(
                                        children: [
                                          const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                                          const SizedBox(width: 2),
                                          Text(
                                            f.rating!.toStringAsFixed(1),
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 24),

          // SECTION 2: WHAT MEMBERS SAY (User Reviews Section)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'WHAT MEMBERS SAY',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                child: const Row(
                  children: [
                    Icon(Icons.star_rounded, size: 14, color: Color(0xFFD97706)),
                    SizedBox(width: 3),
                    Text('4.9 / 5.0', style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w800, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                if (reviews.isNotEmpty)
                  ...reviews.take(6).map((r) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: _memberReviewCard(
                        context: context,
                        name: r.name,
                        role: 'Verified Athlete',
                        rating: r.rating,
                        comment: r.review,
                        facility: r.facilityName ?? 'Sports Arena',
                        photoPaths: r.photoPaths,
                      ),
                    );
                  })
                else ...[
                  _memberReviewCard(
                    context: context,
                    name: 'Aiden Fernando',
                    role: 'Badminton Club Captain',
                    rating: 5,
                    comment: 'The tournament court flooring is outstanding and gear rental on-site makes team training seamless.',
                    facility: 'Badminton Court 1',
                    photoPaths: const ['assets/images/facility-badminton.jpg'],
                  ),
                  const SizedBox(width: 12),
                  _memberReviewCard(
                    context: context,
                    name: 'Dinuka Senanayake',
                    role: 'Premier Football League',
                    rating: 5,
                    comment: 'Best artificial turf in Colombo! Rain check policy and instant lighting are game changers.',
                    facility: 'Main Football Turf',
                    photoPaths: const ['assets/images/sports-hero.jpg'],
                  ),
                  const SizedBox(width: 12),
                  _memberReviewCard(
                    context: context,
                    name: 'Kavindi Perera',
                    role: 'National Masters Swimmer',
                    rating: 5,
                    comment: 'Pristine temperature-regulated water and immaculate lane markers. Five stars without question.',
                    facility: 'Olympic Swimming Pool',
                    photoPaths: const ['assets/images/facility-swimming.jpg'],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          // SECTION 3: ATHLETE SUPPORT & HELP DESK
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Support & Help Desk',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
              ),
              TextButton(
                onPressed: () => onNavigateTab(3), // Support tab
                child: const Text('Open Desk', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: AppTheme.successDark, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'On-Site Facility Staff Ready',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        supportRequests.isNotEmpty
                            ? '${supportRequests.length} active ticket${supportRequests.length > 1 ? 's' : ''} logged'
                            : 'Fast resolution for rain reschedules, equipment & passes.',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => onNavigateTab(3),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Help', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // SECTION: YOUR BOOKINGS & PASSES (Replaces dummy venue schedule)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text(
                    'Your Bookings',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(8)),
                    child: Text(
                      '${bookings.where((b) => !b.isCancelled).length}',
                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 11),
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () => onNavigateTab(1), // Switch to Bookings tab
                child: const Text('View All', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (bookings.where((b) => !b.isCancelled).isEmpty)
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppTheme.border),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppTheme.primaryBg, shape: BoxShape.circle),
                    child: const Icon(Icons.sports_tennis_rounded, color: AppTheme.primary, size: 28),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'No Active Bookings',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.deepHeading),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Ready to hit the court? Reserve a facility slot and receive instant digital QR gate pass verification.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: onOpenBookingWizard,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Book Court Now', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            )
          else
            ...bookings.where((b) => !b.isCancelled).take(4).map((b) {
              final dateStr = DateFormat('EEE, MMM d').format(b.bookingDate);
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.border),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 3)),
                  ],
                ),
                child: InkWell(
                  onTap: () => onNavigateTab(1),
                  child: Row(
                    children: [
                      // Time slot badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBg,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              b.startTime.length >= 5 ? b.startTime.substring(0, 5) : b.startTime,
                              style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w900, fontSize: 13),
                            ),
                            Text(
                              '${b.hoursNeeded}h slot',
                              style: const TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      // Details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    b.facilityName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.deepHeading, fontSize: 14),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                  decoration: BoxDecoration(
                                    color: b.isConfirmed ? AppTheme.successBg : const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    b.status,
                                    style: TextStyle(
                                      color: b.isConfirmed ? AppTheme.successDark : const Color(0xFFB45309),
                                      fontWeight: FontWeight.w800,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '$dateStr • ${b.startTime.length >= 5 ? b.startTime.substring(0, 5) : b.startTime} - ${b.endTime.length >= 5 ? b.endTime.substring(0, 5) : b.endTime}',
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Quick QR pass button
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: AppTheme.scaffoldBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: const Icon(Icons.qr_code_2_rounded, size: 20, color: AppTheme.deepHeading),
                        ),
                        tooltip: 'View Gate Pass QR',
                        onPressed: () => TicketQrModal.show(context, b),
                      ),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _statCard({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 10),
            Text(
              value,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _memberReviewCard({
    required BuildContext context,
    required String name,
    required String role,
    required int rating,
    required String comment,
    required String facility,
    List<String> photoPaths = const [],
  }) {
    return Container(
      width: 270,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppTheme.primaryBg,
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'M',
                  style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.primary),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                    Text(role, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(rating, (_) => const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B))),
          ),
          const SizedBox(height: 6),
          Text(
            '"$comment"',
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: Color(0xFF334155), fontStyle: FontStyle.italic, height: 1.3),
          ),
          // Attached Photos row
          if (photoPaths.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: 52,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: photoPaths.length,
                separatorBuilder: (context, index) => const SizedBox(width: 6),
                itemBuilder: (ctx, idx) {
                  final photo = photoPaths[idx];
                  return GestureDetector(
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (dCtx) => Dialog(
                          backgroundColor: Colors.transparent,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: InteractiveViewer(
                                  child: buildUniversalImage(photo, fit: BoxFit.contain),
                                ),
                              ),
                              Positioned(
                                top: 10,
                                right: 10,
                                child: GestureDetector(
                                  onTap: () => Navigator.pop(dCtx),
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                    child: const Icon(Icons.close, color: Colors.white, size: 20),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        decoration: BoxDecoration(border: Border.all(color: AppTheme.border)),
                        child: buildUniversalImage(photo, width: 52, height: 52, fit: BoxFit.cover),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: AppTheme.scaffoldBg, borderRadius: BorderRadius.circular(6)),
            child: Text('📍 $facility', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted)),
          ),
        ],
      ),
    );
  }
}
