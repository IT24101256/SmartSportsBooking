import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';
import 'models/facility.dart';
import 'models/booking.dart';
import 'models/support.dart';
import 'widgets/auth_modal.dart';
import 'widgets/edit_facility_modal.dart';
import 'screens/home/overview_screen.dart';
import 'screens/facilities/facilities_screen.dart';
import 'screens/facilities/facility_details_screen.dart';
import 'screens/bookings/bookings_screen.dart';
import 'screens/bookings/booking_wizard_sheet.dart';
import 'screens/support/support_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'widgets/ai_chat_sheet.dart';
import 'widgets/book_with_ai_sheet.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ApiService().initialize();
  runApp(const SmartSportsApp());
}

class SmartSportsApp extends StatelessWidget {
  const SmartSportsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MySpot',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  final ApiService _apiService = ApiService();

  int _selectedTab = 0;
  bool _isLoadingData = false;

  List<Facility> _facilities = [];
  List<Booking> _bookings = [];
  List<SupportRequest> _supportRequests = [];
  List<BookingReviewItem> _reviews = [];
  List<Map<String, dynamic>> _scheduleEvents = [];
  Map<String, dynamic> _dashboardStats = {};

  Facility? _viewingFacility;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoadingData = true);
    try {
      final futures = <Future<dynamic>>[
        _apiService.getFacilities().catchError((_) => <Facility>[]),
        _apiService.getSchedule().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getStats().catchError((_) => <String, dynamic>{}),
        _apiService.getReviews().catchError((_) => <BookingReviewItem>[]),
      ];

      if (_apiService.isAuthenticated) {
        futures.add(_apiService.getBookings().catchError((_) => <Booking>[]));
        futures.add(_apiService.getSupportRequests().catchError((_) => <SupportRequest>[]));
      }

      final results = await Future.wait(futures);

      if (mounted) {
        setState(() {
          _facilities = results[0] as List<Facility>;
          _scheduleEvents = results[1] as List<Map<String, dynamic>>;
          _dashboardStats = results[2] as Map<String, dynamic>;
          _reviews = results[3] as List<BookingReviewItem>;

          if (_apiService.isAuthenticated && results.length >= 6) {
            final rawBookings = results[4] as List<Booking>;
            _bookings = rawBookings.map((b) {
              final rev = _reviews.where((r) => r.bookingId == b.id).firstOrNull;
              return rev != null ? b.copyWith(review: rev) : b;
            }).toList();
            _supportRequests = results[5] as List<SupportRequest>;
          } else {
            _bookings = [];
            _supportRequests = [];
          }
          _isLoadingData = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingData = false);
    }
  }

  void _showServerSettingsDialog() {
    final controller = TextEditingController(text: _apiService.baseUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Backend API URL'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select a preset or enter the IP/domain of your SmartSports .NET backend:',
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Base URL',
                hintText: 'http://localhost:5187',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  label: const Text('Localhost (USB / adb reverse)'),
                  onPressed: () => controller.text = 'http://localhost:5187',
                ),
                ActionChip(
                  label: const Text('Current Wi-Fi (172.28.6.251)'),
                  onPressed: () => controller.text = 'http://172.28.6.251:5187',
                ),
                ActionChip(
                  label: const Text('Home LAN (192.168.8.140)'),
                  onPressed: () => controller.text = 'http://192.168.8.140:5187',
                ),
                ActionChip(
                  label: const Text('10.0.2.2 (Android Emulator)'),
                  onPressed: () => controller.text = 'http://10.0.2.2:5187',
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'For USB: Run "adb reverse tcp:5187 tcp:5187" on PC and use Localhost.',
              style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textMuted),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _apiService.baseUrl = controller.text.trim();
              });
              Navigator.pop(ctx);
              _loadAllData();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('API URL updated to ${_apiService.baseUrl}')),
              );
            },
            child: const Text('Save URL'),
          ),
        ],
      ),
    );
  }

  void _openAuthModal({String initialMode = 'login', VoidCallback? onSuccess}) {
    AuthModal.show(
      context,
      initialMode: initialMode,
      onLoginSuccess: () {
        setState(() {});
        _loadAllData();
        onSuccess?.call();
      },
    );
  }

  void _openBookingWizard({Facility? initialFacility}) {
    if (!_apiService.isAuthenticated) {
      _openAuthModal(
        onSuccess: () {
          BookingWizardSheet.show(
            context,
            facilities: _facilities,
            initialFacility: initialFacility,
            onBookingCreated: () {
              _loadAllData();
              setState(() => _selectedTab = 1);
            },
          );
        },
      );
      return;
    }

    BookingWizardSheet.show(
      context,
      facilities: _facilities,
      initialFacility: initialFacility,
      onBookingCreated: () {
        _loadAllData();
        setState(() => _selectedTab = 1); // Switch to bookings tab
      },
    );
  }

  void _openBookWithAi() {
    if (!_apiService.isAuthenticated) {
      _openAuthModal();
      return;
    }
    BookWithAiSheet.show(
      context,
      onBookingCreated: () {
        _loadAllData();
        setState(() => _selectedTab = 1);
      },
    );
  }

  void _logout() {
    _apiService.logout();
    setState(() {
      _bookings.clear();
      _supportRequests.clear();
      _selectedTab = 0;
      _viewingFacility = null;
    });
    _loadAllData();
  }

  @override
  Widget build(BuildContext context) {
    // If viewing a detailed facility view
    if (_viewingFacility != null) {
      return FacilityDetailsScreen(
        facility: _viewingFacility!,
        onBack: () => setState(() => _viewingFacility = null),
        onBookNow: () {
          final f = _viewingFacility!;
          _openBookingWizard(initialFacility: f);
        },
      );
    }

    // Tabs content with guest-aware fallbacks
    final Widget currentScreen = switch (_selectedTab) {
      1 => _apiService.isAuthenticated
          ? BookingsScreen(
              bookings: _bookings,
              facilities: _facilities,
              isLoading: _isLoadingData,
              onRefresh: _loadAllData,
              onNewBooking: () => _openBookingWizard(),
            )
          : _GuestLockedTabPlaceholder(
              title: 'Member Bookings',
              description: 'Sign in to view your court reservations, active tickets, and QR access passes.',
              icon: Icons.calendar_month_rounded,
              onSignIn: () => _openAuthModal(),
            ),
      2 => FacilitiesScreen(
          facilities: _facilities,
          isLoading: _isLoadingData,
          onRefresh: _loadAllData,
          onSelectFacility: (f) => setState(() => _viewingFacility = f),
          onQuickBook: (f) => _openBookingWizard(initialFacility: f),
        ),
      3 => _apiService.isAuthenticated
          ? SupportScreen(
              supportRequests: _supportRequests,
              isLoading: _isLoadingData,
              onRefresh: _loadAllData,
            )
          : _GuestLockedTabPlaceholder(
              title: 'Athlete Support Desk',
              description: 'Sign in to submit tickets, speak with staff, or request rescheduling.',
              icon: Icons.support_agent_rounded,
              onSignIn: () => _openAuthModal(),
            ),
      4 => _apiService.isAuthenticated
          ? ProfileScreen(
              onLogout: _logout,
              onConfigureServer: kDebugMode ? _showServerSettingsDialog : null,
            )
          : _GuestLockedTabPlaceholder(
              title: 'Athlete Profile',
              description: 'Sign in to manage your profile information, password, and member benefits.',
              icon: Icons.person_rounded,
              onSignIn: () => _openAuthModal(),
            ),
      _ => OverviewScreen(
          facilities: _facilities,
          bookings: _bookings,
          supportRequests: _supportRequests,
          scheduleEvents: _scheduleEvents,
          dashboardStats: _dashboardStats,
          reviews: _reviews,
          isLoading: _isLoadingData,
          onRefresh: _loadAllData,
          onNavigateTab: (tab) => setState(() => _selectedTab = tab),
          onSelectFacility: (f) => setState(() => _viewingFacility = f),
          onOpenBookingWizard: () => _openBookingWizard(),
          onOpenBookWithAi: _openBookWithAi,
        ),
    };

    final user = _apiService.currentUser;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(9),
              child: Image.asset(
                'assets/images/app-icon.png',
                width: 32,
                height: 32,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2DD4BF), AppTheme.primary],
                    ),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Center(
                    child: Text('S', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'MySpot',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(color: AppTheme.success, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      user != null ? '${user.role.toUpperCase()} LIVE' : 'GUEST',
                      style: const TextStyle(fontSize: 9.5, color: AppTheme.successDark, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.dns_rounded, size: 19, color: AppTheme.textMuted),
            tooltip: 'Server URL',
            padding: const EdgeInsets.all(8),
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            onPressed: _showServerSettingsDialog,
          ),
          const SizedBox(width: 2),
          if (!_apiService.isAuthenticated)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ElevatedButton.icon(
                onPressed: () => _openAuthModal(),
                icon: const Icon(Icons.login_rounded, size: 15),
                label: const Text('Sign In', style: TextStyle(fontSize: 12.5)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(0, 34),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ElevatedButton.icon(
                onPressed: () => _openBookingWizard(),
                icon: const Icon(Icons.add, size: 15),
                label: const Text('Book', style: TextStyle(fontSize: 12.5)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(0, 34),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
        ],
      ),
      body: currentScreen,
      floatingActionButton: (_selectedTab == 2 && _apiService.currentUser?.isAdmin == true && _viewingFacility == null)
          ? Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                FloatingActionButton.small(
                  heroTag: 'addFacilityFab',
                  onPressed: () => EditFacilityModal.show(context, null, _loadAllData),
                  tooltip: 'Add Facility',
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  child: const Icon(Icons.add_rounded),
                ),
                const SizedBox(height: 10),
                FloatingActionButton.extended(
                  heroTag: 'askAiFab',
                  onPressed: () => AiChatSheet.show(context),
                  icon: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
                  label: const Text('Ask AI', style: TextStyle(fontWeight: FontWeight.w800)),
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                ),
              ],
            )
          : FloatingActionButton.extended(
              heroTag: 'askAiFab',
              onPressed: () => AiChatSheet.show(context),
              icon: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
              label: const Text('Ask AI', style: TextStyle(fontWeight: FontWeight.w800)),
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTab,
        onTap: (index) {
          setState(() {
            _selectedTab = index;
            _viewingFacility = null;
          });
        },
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Overview'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_rounded), label: 'Bookings'),
          BottomNavigationBarItem(icon: Icon(Icons.sports_tennis_rounded), label: 'Facilities'),
          BottomNavigationBarItem(icon: Icon(Icons.support_agent_rounded), label: 'Support'),
          BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }
}

class _GuestLockedTabPlaceholder extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final VoidCallback onSignIn;

  const _GuestLockedTabPlaceholder({
    required this.title,
    required this.description,
    required this.icon,
    required this.onSignIn,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFBAE6FD), width: 1.5),
              ),
              child: Icon(icon, size: 40, color: const Color(0xFF0284C7)),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: AppTheme.deepHeading,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, color: AppTheme.textMuted, height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onSignIn,
              icon: const Icon(Icons.login_rounded, size: 18),
              label: const Text('Sign In or Register'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
