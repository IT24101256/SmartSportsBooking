import 'package:flutter/material.dart';
import 'services/api_service.dart';

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
      title: 'SmartSports',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1D4ED8)),
        scaffoldBackgroundColor: const Color(0xFFF4F8FF),
        useMaterial3: true,
      ),
      home: const SmartSportsHomePage(),
    );
  }
}

class SmartSportsHomePage extends StatefulWidget {
  const SmartSportsHomePage({super.key});

  @override
  State<SmartSportsHomePage> createState() => _SmartSportsHomePageState();
}

class _SmartSportsHomePageState extends State<SmartSportsHomePage> {
  final ApiService _apiService = ApiService();

  int _selectedTab = 0;
  bool _loggedIn = false;
  bool _showRegister = false;
  bool _isAuthLoading = false;
  bool _isDataLoading = false;
  String _authMessage = '';
  bool _authIsError = true;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  List<Map<String, dynamic>> _liveFacilities = [];
  List<Map<String, dynamic>> _liveBookings = [];
  List<Map<String, dynamic>> _liveSchedule = [];
  List<Map<String, dynamic>> _liveSupport = [];

  @override
  void initState() {
    super.initState();
    _emailController.text = 'admin@smartsports.com';
    _passwordController.text = 'admin123';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _authMessage = 'Please enter your email and password.';
        _authIsError = true;
      });
      return;
    }

    setState(() {
      _isAuthLoading = true;
      _authMessage = '';
    });

    try {
      await _apiService.login(email, password);
      setState(() {
        _loggedIn = true;
        _isAuthLoading = false;
      });
      await _loadAllData();
    } catch (e) {
      setState(() {
        _isAuthLoading = false;
        _authIsError = true;
        _authMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _handleRegister() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (name.isEmpty || email.isEmpty || password.length < 6) {
      setState(() {
        _authMessage = 'Enter your name, email and a password of at least 6 characters.';
        _authIsError = true;
      });
      return;
    }

    setState(() {
      _isAuthLoading = true;
      _authMessage = '';
    });

    try {
      await _apiService.register(name, email, password);
      setState(() {
        _isAuthLoading = false;
        _showRegister = false;
        _authIsError = false;
        _authMessage = 'Registration successful! Please sign in.';
      });
    } catch (e) {
      setState(() {
        _isAuthLoading = false;
        _authIsError = true;
        _authMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _demoLogin() async {
    _emailController.text = 'admin@smartsports.com';
    _passwordController.text = 'admin123';
    await _handleLogin();
  }

  Future<void> _loadAllData() async {
    if (!_loggedIn) return;
    setState(() => _isDataLoading = true);

    try {
      final results = await Future.wait([
        _apiService.getFacilities().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getBookings().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getSchedule().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getSupportRequests().catchError((_) => <Map<String, dynamic>>[]),
      ]);

      if (mounted) {
        setState(() {
          _liveFacilities = results[0];
          _liveBookings = results[1];
          _liveSchedule = results[2];
          _liveSupport = results[3];
          _isDataLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isDataLoading = false);
      }
    }
  }

  void _logout() {
    _apiService.logout();
    setState(() {
      _loggedIn = false;
      _liveFacilities.clear();
      _liveBookings.clear();
      _liveSchedule.clear();
      _liveSupport.clear();
    });
  }

  void _showServerSettingsDialog() {
    final controller = TextEditingController(text: _apiService.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Backend API URL'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select a preset or enter your backend server URL:',
              style: TextStyle(fontSize: 13, color: Color(0xFF5D7692)),
            ),
            const SizedBox(height: 12),
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
                  label: const Text('Localhost (USB / Web)'),
                  onPressed: () => controller.text = 'http://localhost:5187',
                ),
                ActionChip(
                  label: const Text('10.0.2.2 (Emulator)'),
                  onPressed: () => controller.text = 'http://10.0.2.2:5187',
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _apiService.baseUrl = controller.text.trim();
              });
              Navigator.pop(ctx);
              if (_loggedIn) {
                _loadAllData();
              }
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('API URL updated to ${_apiService.baseUrl}')),
              );
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _openBookingDialog() {
    if (_liveFacilities.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No facilities available to book.')),
      );
      return;
    }

    int selectedFacilityId = _liveFacilities.first['id'] as int;
    final noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Book a Facility'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select facility:', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                DropdownButtonFormField<int>(
                  initialValue: selectedFacilityId,
                  isExpanded: true,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: _liveFacilities.map((f) {
                    return DropdownMenuItem<int>(
                      value: f['id'] as int,
                      child: Text(
                        '${f['name']} (${f['type']})',
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() => selectedFacilityId = val);
                    }
                  },
                ),
                const SizedBox(height: 14),
                const Text('Time: Today, 17:00 - 18:00 (1 Hour)', style: TextStyle(fontSize: 13, color: Color(0xFF5D7692))),
                const SizedBox(height: 14),
                TextField(
                  controller: noteController,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(ctx);
                try {
                  await _apiService.createBooking(
                    facilityId: selectedFacilityId,
                    bookingDate: DateTime.now().toUtc(),
                    startTime: '17:00:00',
                    endTime: '18:00:00',
                    notes: noteController.text.trim(),
                  );
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Booking created successfully!')),
                  );
                  _loadAllData();
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(content: Text('Booking failed: ${e.toString().replaceAll('Exception: ', '')}')),
                  );
                }
              },
              child: const Text('Confirm Booking'),
            ),
          ],
        ),
      ),
    );
  }

  void _openSupportDialog() {
    final titleController = TextEditingController();
    final detailController = TextEditingController();
    String priority = 'Medium';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New Support Request'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: detailController,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Details', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                const Text('Priority:', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: priority,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: ['Low', 'Medium', 'High'].map((p) {
                    return DropdownMenuItem(value: p, child: Text(p));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setDialogState(() => priority = val);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                final title = titleController.text.trim();
                final detail = detailController.text.trim();
                if (title.isEmpty || detail.isEmpty) return;

                Navigator.pop(ctx);
                try {
                  await _apiService.createSupportRequest(
                    title: title,
                    detail: detail,
                    priority: priority,
                  );
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Support request submitted!')),
                  );
                  _loadAllData();
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(content: Text('Submission failed: ${e.toString().replaceAll('Exception: ', '')}')),
                  );
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  String _getEmojiForSport(String type) {
    final lower = type.toLowerCase();
    if (lower.contains('foot') || lower.contains('soccer')) return '⚽';
    if (lower.contains('badminton')) return '🏸';
    if (lower.contains('swim')) return '🏊';
    if (lower.contains('tennis') && !lower.contains('table')) return '🎾';
    if (lower.contains('basket')) return '🏀';
    if (lower.contains('gym') || lower.contains('fit')) return '🏋️';
    if (lower.contains('volley')) return '🏐';
    if (lower.contains('cricket')) return '🏏';
    if (lower.contains('table') || lower.contains('ping')) return '🏓';
    if (lower.contains('squash')) return '🎾';
    return '🏟️';
  }

  @override
  Widget build(BuildContext context) {
    if (!_loggedIn) {
      return _buildAuthScreen();
    }

    final screenWidth = MediaQuery.of(context).size.width;
    final isPhone = screenWidth < 600;

    final stats = [
      {
        'label': 'Facilities',
        'value': _liveFacilities.isNotEmpty ? _liveFacilities.length.toString() : '14',
        'color': const Color(0xFF10B981),
      },
      {
        'label': 'Bookings',
        'value': _liveBookings.isNotEmpty ? _liveBookings.length.toString() : '0',
        'color': const Color(0xFF2563EB),
      },
      {
        'label': 'Rating',
        'value': '4.9',
        'color': const Color(0xFFF59E0B),
      },
    ];

    final facilities = _liveFacilities.isNotEmpty
        ? _liveFacilities.map((f) {
            final type = (f['type'] ?? 'Sports').toString();
            final isAvailable = f['isAvailable'] == true;
            return {
              'name': (f['name'] ?? 'Facility').toString(),
              'type': type,
              'price': 'LKR 2,500 / hr',
              'emoji': _getEmojiForSport(type),
              'status': isAvailable ? 'Available now' : 'Booked',
            };
          }).toList()
        : [
            {
              'name': 'Championship Turf',
              'type': 'Football',
              'price': 'LKR 4,500 / hour',
              'emoji': '⚽',
              'status': 'Available now',
            },
            {
              'name': 'Skyline Court',
              'type': 'Badminton',
              'price': 'LKR 1,200 / hour',
              'emoji': '🏸',
              'status': 'Next slot 5:30 PM',
            },
            {
              'name': 'Aqua Arena',
              'type': 'Swimming',
              'price': 'LKR 2,000 / session',
              'emoji': '🏊',
              'status': 'Open today',
            },
          ];

    final bookings = _liveBookings.isNotEmpty
        ? _liveBookings.map((b) {
            final fac = b['facility'] as Map<String, dynamic>?;
            final facName = fac != null ? (fac['name'] ?? 'Facility') : 'Facility #${b['facilityId']}';
            final bookingDate = b['bookingDate'] != null ? b['bookingDate'].toString().split('T').first : '';
            final startTime = b['startTime'] ?? '';
            final status = b['status'] ?? 'Confirmed';
            return {
              'name': facName.toString(),
              'date': '$bookingDate • $startTime',
              'status': status.toString(),
            };
          }).toList()
        : [
            {'name': 'SLIIT Basketball Court', 'date': 'Today, 05:00 PM', 'status': 'Confirmed'},
          ];

    final support = _liveSupport.isNotEmpty
        ? _liveSupport.map((s) {
            return {
              'title': (s['title'] ?? 'Support Request').toString(),
              'detail': (s['detail'] ?? '').toString(),
              'priority': (s['priority'] ?? 'Medium').toString(),
            };
          }).toList()
        : [
            {'title': 'Booking query', 'detail': 'Need to check weekend court availability', 'priority': 'Medium'},
          ];

    final schedule = _liveSchedule.isNotEmpty
        ? _liveSchedule.map((ev) {
            final startTime = (ev['startTime'] ?? '').toString();
            final title = (ev['title'] ?? 'Event').toString();
            final coach = (ev['coach'] ?? 'Coach').toString();
            return {
              'time': startTime.length > 5 ? startTime.substring(0, 5) : startTime,
              'title': title,
              'coach': coach,
            };
          }).toList()
        : [
            {'time': '09:00', 'title': 'Basketball training', 'coach': 'Coach Liam'},
            {'time': '11:30', 'title': 'Tennis clinic', 'coach': 'Coach Maya'},
            {'time': '19:00', 'title': 'Community match', 'coach': 'Captain team'},
          ];

    final heroCard = Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1D4ED8)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _pill('Backend Connected • PostgreSQL'),
              IconButton(
                icon: const Icon(Icons.refresh, color: Colors.white70),
                onPressed: _loadAllData,
                tooltip: 'Refresh data',
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Play harder.\nBook smarter.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Reserve premium courts, track training time, and manage your active schedule in one place.',
            style: TextStyle(
              color: Color(0xFFDDEBFF),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              ElevatedButton.icon(
                onPressed: _openBookingDialog,
                icon: const Icon(Icons.add),
                label: const Text('Book a facility'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF10233E),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              OutlinedButton(
                onPressed: () => setState(() => _selectedTab = 1),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('View bookings'),
              ),
            ],
          ),
        ],
      ),
    );

    final statCards = GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isPhone ? 2 : 3,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: isPhone ? 1.95 : 1.6,
      ),
      itemCount: stats.length,
      itemBuilder: (context, index) {
        final stat = stats[index];
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                stat['label'] as String,
                style: const TextStyle(
                  color: Color(0xFF5D7692),
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                stat['value'] as String,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: stat['color'] as Color,
                ),
              ),
            ],
          ),
        );
      },
    );

    final facilityPanel = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Available facilities',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF10233E),
                ),
              ),
              TextButton(
                onPressed: () => setState(() => _selectedTab = 2),
                child: const Text('See all'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...facilities.take(4).map((facility) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8).withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(
                        facility['emoji'] as String,
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                facility['name'] as String,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  color: Color(0xFF10233E),
                                ),
                              ),
                            ),
                            Text(
                              facility['type'] as String,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF5D7692),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              facility['price'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF10233E),
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              facility['status'] as String,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF10B981),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );

    final bookingPanel = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'My bookings',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF10233E),
                ),
              ),
              TextButton(
                onPressed: () => setState(() => _selectedTab = 1),
                child: const Text('All bookings'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...bookings.take(3).map((b) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FBFF),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b['name'] as String,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF10233E)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          b['date'] as String,
                          style: const TextStyle(color: Color(0xFF5D7692), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1FAE5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      b['status'] as String,
                      style: const TextStyle(color: Color(0xFF0F766E), fontWeight: FontWeight.w700, fontSize: 11),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );

    final supportPanel = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Support requests',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF10233E),
                ),
              ),
              TextButton(
                onPressed: _openSupportDialog,
                child: const Text('New request'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...support.take(3).map((item) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FBFF),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['title'] as String,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF10233E)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item['detail'] as String,
                          style: const TextStyle(color: Color(0xFF5D7692), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      item['priority'] as String,
                      style: const TextStyle(color: Color(0xFF0F4C81), fontWeight: FontWeight.w700, fontSize: 11),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );

    final schedulePanel = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Training schedule',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF10233E),
            ),
          ),
          const SizedBox(height: 12),
          ...schedule.map((item) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF7FAFF),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      item['time'] as String,
                      style: const TextStyle(color: Color(0xFF1D4ED8), fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['title'] as String,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF10233E)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item['coach'] as String,
                          style: const TextStyle(color: Color(0xFF5D7692), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );

    final homeContent = RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: EdgeInsets.all(isPhone ? 16 : 20),
        children: [
          if (_isDataLoading)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: LinearProgressIndicator(),
            ),
          heroCard,
          const SizedBox(height: 22),
          statCards,
          const SizedBox(height: 22),
          facilityPanel,
          const SizedBox(height: 18),
          bookingPanel,
          const SizedBox(height: 18),
          supportPanel,
          const SizedBox(height: 18),
          schedulePanel,
        ],
      ),
    );

    final bookingsContent = RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'My bookings',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF10233E),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _openBookingDialog,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Book'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1D4ED8),
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (bookings.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Text('No bookings found. Tap "Book" to create one.'),
            )
          else
            ...bookings.map((b) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(100),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            b['name'] as String,
                            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF10233E)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            b['date'] as String,
                            style: const TextStyle(color: Color(0xFF5D7692), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1FAE5),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        b['status'] as String,
                        style: const TextStyle(color: Color(0xFF0F766E), fontWeight: FontWeight.w700, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );

    final facilitiesContent = RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Facilities (${facilities.length})',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF10233E),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _loadAllData,
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...facilities.map((facility) {
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1D4ED8).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Center(
                      child: Text(
                        facility['emoji'] as String,
                        style: const TextStyle(fontSize: 28),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          facility['name'] as String,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF10233E),
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          facility['type'] as String,
                          style: const TextStyle(color: Color(0xFF5D7692), fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              facility['price'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF10233E),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              facility['status'] as String,
                              style: const TextStyle(
                                color: Color(0xFF10B981),
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );

    final user = _apiService.currentUser;
    final initials = user != null && user.fullName.isNotEmpty
        ? (user.fullName.split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join())
        : 'U';

    final profileContent = ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1D4ED8)],
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 24,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                user?.fullName.isNotEmpty == true ? user!.fullName : 'Member',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Role: ${user?.role ?? 'Customer'} • User ID ${user?.id ?? 0}',
                style: const TextStyle(
                  color: Color(0xFFE0F2FE),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            children: [
              _profileRow('Email', user?.email ?? 'Unknown'),
              const Divider(height: 24),
              _profileRow('Role', user?.role ?? 'Customer'),
              const Divider(height: 24),
              _profileRow('Backend URL', _apiService.baseUrl),
            ],
          ),
        ),
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: _showServerSettingsDialog,
          icon: const Icon(Icons.settings),
          label: const Text('Configure Backend URL'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: _logout,
          icon: const Icon(Icons.logout),
          label: const Text('Sign out'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEF4444),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ],
    );

    final tabContent = switch (_selectedTab) {
      1 => bookingsContent,
      2 => facilitiesContent,
      3 => profileContent,
      _ => homeContent,
    };

    return Scaffold(
      backgroundColor: const Color(0xFFF4F8FF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2DD4BF), Color(0xFF2563EB)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text(
                  'S',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SmartSports',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF10233E),
                  ),
                ),
                Text(
                  'Live API Connected',
                  style: TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Color(0xFF5D7692)),
            onPressed: _showServerSettingsDialog,
            tooltip: 'Server Settings',
          ),
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: ElevatedButton(
              onPressed: _openBookingDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Book'),
            ),
          ),
        ],
      ),
      body: tabContent,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTab,
        onTap: (index) => setState(() => _selectedTab = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF1D4ED8),
        unselectedItemColor: const Color(0xFF5D7692),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_rounded), label: 'Bookings'),
          BottomNavigationBarItem(icon: Icon(Icons.sports_tennis_rounded), label: 'Facilities'),
          BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildAuthScreen() {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1D4ED8), Color(0xFF0F766E)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                elevation: 12,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const CircleAvatar(
                        radius: 30,
                        backgroundColor: Color(0xFF1D4ED8),
                        child: Text('S', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _showRegister ? 'Create Account' : 'Welcome Back',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF10233E)),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _showRegister
                            ? 'Register with SmartSports .NET backend.'
                            : 'Sign in to access your bookings and facilities.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF5D7692), fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: _showServerSettingsDialog,
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.dns, size: 14, color: Color(0xFF2563EB)),
                              const SizedBox(width: 6),
                              Text(
                                _apiService.baseUrl,
                                style: const TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.edit, size: 12, color: Color(0xFF2563EB)),
                            ],
                          ),
                        ),
                      ),
                      if (_authMessage.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: _authIsError ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            _authMessage,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _authIsError ? const Color(0xFFB91C1C) : const Color(0xFF15803D),
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                      if (_showRegister) ...[
                        const SizedBox(height: 16),
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder()),
                        ),
                      ],
                      const SizedBox(height: 14),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton(
                        onPressed: _isAuthLoading
                            ? null
                            : (_showRegister ? _handleRegister : _handleLogin),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D4ED8),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _isAuthLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(_showRegister ? 'Register' : 'Sign in'),
                      ),
                      const SizedBox(height: 10),
                      if (!_showRegister) ...[
                        OutlinedButton.icon(
                          onPressed: _isAuthLoading ? null : _demoLogin,
                          icon: const Icon(Icons.flash_on, size: 18, color: Color(0xFF1D4ED8)),
                          label: const Text('Quick Demo Login (Admin)'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(height: 6),
                      ],
                      TextButton(
                        onPressed: () => setState(() {
                          _showRegister = !_showRegister;
                          _authMessage = '';
                        }),
                        child: Text(_showRegister ? 'Back to sign in' : 'Don\'t have an account? Register'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  static Widget _profileRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF5D7692),
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF10233E),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  static Widget _pill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          letterSpacing: 0.12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
