import 'dart:convert';
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
  List<Map<String, dynamic>> _liveWorkflows = [];
  List<Map<String, dynamic>> _teamMembers = [];
  Map<String, dynamic> _rewards = {};

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
      final isAdmin = _apiService.currentUser?.role.toLowerCase() == 'admin' ||
          _apiService.currentUser?.role.toLowerCase() == 'manager';

      final results = await Future.wait([
        _apiService.getFacilities().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getBookings().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getSchedule().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getSupportRequests().catchError((_) => <Map<String, dynamic>>[]),
        (isAdmin ? _apiService.getAdminWorkflows() : _apiService.getWorkflowHistory())
            .catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getTeam().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.getRewards().catchError((_) => <String, dynamic>{}),
      ]);

      if (mounted) {
        setState(() {
          _liveFacilities = results[0] as List<Map<String, dynamic>>;
          _liveBookings = results[1] as List<Map<String, dynamic>>;
          _liveSchedule = results[2] as List<Map<String, dynamic>>;
          _liveSupport = results[3] as List<Map<String, dynamic>>;
          _liveWorkflows = results[4] as List<Map<String, dynamic>>;
          _teamMembers = results[5] as List<Map<String, dynamic>>;
          _rewards = results[6] as Map<String, dynamic>;
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
      _liveWorkflows.clear();
      _teamMembers.clear();
      _rewards.clear();
    });
  }

  Future<void> _addTeamMemberDialog() async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Add team player'),
        content: TextField(controller: controller, autofocus: true, decoration: const InputDecoration(labelText: 'Player name')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          ElevatedButton(onPressed: () async {
            if (controller.text.trim().isEmpty) return;
            try {
              final member = await _apiService.addTeamMember(controller.text);
              if (mounted) setState(() => _teamMembers.add(member));
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            } catch (error) {
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
            }
          }, child: const Text('Add')),
        ],
      ),
    );
    controller.dispose();
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

  void _openAIWorkflowDialog() {
    final objectiveController = TextEditingController(text: '16-Team Inter-University Badminton Championship');
    String facilityType = 'Badminton';
    final startTimeController = TextEditingController(text: '09:00');
    final endTimeController = TextEditingController(text: '12:00');
    final guestsController = TextEditingController(text: '24');
    final budgetController = TextEditingController(text: '35000');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.auto_awesome, color: Color(0xFF1D4ED8)),
              SizedBox(width: 8),
              Text('Launch AI Workflow', style: TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Quick Domain Presets:',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF5D7692)),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ActionChip(
                      label: const Text('🏸 Badminton Cup', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setDialogState(() {
                          objectiveController.text = '16-Team Inter-University Badminton Championship';
                          facilityType = 'Badminton';
                          startTimeController.text = '09:00';
                          endTimeController.text = '12:00';
                          guestsController.text = '24';
                          budgetController.text = '35000';
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('⚽ Football Match', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setDialogState(() {
                          objectiveController.text = 'Weekend Corporate Cup 11v11 Match';
                          facilityType = 'Football';
                          startTimeController.text = '16:00';
                          endTimeController.text = '18:00';
                          guestsController.text = '22';
                          budgetController.text = '25000';
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('🏊 Swimming Gala', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setDialogState(() {
                          objectiveController.text = 'Junior Squad Aquatic Training Gala';
                          facilityType = 'Swimming';
                          startTimeController.text = '07:00';
                          endTimeController.text = '10:00';
                          guestsController.text = '18';
                          budgetController.text = '20000';
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: objectiveController,
                  decoration: const InputDecoration(labelText: 'Domain Objective', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: facilityType,
                  decoration: const InputDecoration(labelText: 'Sport Type', border: OutlineInputBorder()),
                  items: ['Badminton', 'Football', 'Swimming', 'Tennis', 'Basketball', 'Cricket', 'Fitness'].map((s) {
                    return DropdownMenuItem(value: s, child: Text(s));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setDialogState(() => facilityType = val);
                  },
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: startTimeController,
                        decoration: const InputDecoration(labelText: 'Start (HH:MM)', border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: endTimeController,
                        decoration: const InputDecoration(labelText: 'End (HH:MM)', border: OutlineInputBorder()),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: guestsController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Guests (Max 30)', border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: budgetController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Budget (LKR)', border: OutlineInputBorder()),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                final objective = objectiveController.text.trim();
                final guests = int.tryParse(guestsController.text) ?? 10;
                final budget = double.tryParse(budgetController.text) ?? 20000;
                if (objective.isEmpty) return;

                Navigator.pop(ctx);
                try {
                  final now = DateTime.now().toUtc();
                  final tomorrow = DateTime.utc(now.year, now.month, now.day + 1);
                  final startParts = startTimeController.text.split(':');
                  final endParts = endTimeController.text.split(':');
                  final startHour = int.tryParse(startParts.first) ?? 9;
                  final startMin = int.tryParse(startParts.length > 1 ? startParts[1] : '0') ?? 0;
                  final endHour = int.tryParse(endParts.first) ?? 12;
                  final endMin = int.tryParse(endParts.length > 1 ? endParts[1] : '0') ?? 0;

                  final reqStart = DateTime.utc(tomorrow.year, tomorrow.month, tomorrow.day, startHour, startMin);
                  final reqEnd = DateTime.utc(tomorrow.year, tomorrow.month, tomorrow.day, endHour, endMin);

                  final result = await _apiService.startBookingWorkflow(
                    objective: objective,
                    facilityType: facilityType,
                    requestedStart: reqStart,
                    requestedEnd: reqEnd,
                    guests: guests,
                    budget: budget,
                  );

                  messenger.showSnackBar(
                    SnackBar(content: Text('AI Workflow initiated! Status: ${result['status']}')),
                  );
                  await _loadAllData();
                  setState(() => _selectedTab = 3);
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(content: Text('Workflow failed: ${e.toString().replaceAll('Exception: ', '')}')),
                  );
                }
              },
              icon: const Icon(Icons.rocket_launch, size: 16),
              label: const Text('Start 4-Agent Pipeline'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openWorkflowActionDialog(String workflowId, String action) {
    final commentController = TextEditingController();
    final actionLabel = action == 'approve'
        ? 'Approve & Commit'
        : action == 'revise'
            ? 'Request Revision'
            : 'Reject Safely';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(actionLabel, style: const TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Audit Decision Note (Mandatory):',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF5D7692)),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: commentController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Enter reason or verification comments...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final comment = commentController.text.trim();
              if (comment.isEmpty) return;

              final messenger = ScaffoldMessenger.of(context);
              Navigator.pop(ctx);
              try {
                await _apiService.decideWorkflow(workflowId, action, comment);
                messenger.showSnackBar(
                  SnackBar(content: Text('Workflow $action action executed successfully.')),
                );
                _loadAllData();
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(content: Text('Action failed: ${e.toString().replaceAll('Exception: ', '')}')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: action == 'approve'
                  ? const Color(0xFF10B981)
                  : action == 'revise'
                      ? const Color(0xFFF59E0B)
                      : const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: Text(actionLabel),
          ),
        ],
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
        'value': _liveFacilities.length.toString(),
        'color': const Color(0xFF10B981),
      },
      {
        'label': 'Bookings',
        'value': _liveBookings.length.toString(),
        'color': const Color(0xFF2563EB),
      },
      {
        'label': 'Rating',
        'value': _liveFacilities.where((f) => f['rating'] != null).isEmpty ? 'N/A' : (_liveFacilities.where((f) => f['rating'] != null).map((f) => (f['rating'] as num).toDouble()).reduce((a, b) => a + b) / _liveFacilities.where((f) => f['rating'] != null).length).toStringAsFixed(1),
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
              'price': 'Live pricing in facility details',
              'emoji': _getEmojiForSport(type),
              'status': isAvailable ? 'Available now' : 'Booked',
              'rating': f['rating'],
              'ratingCount': f['ratingCount'] ?? 0,
            };
          }).toList()
        : <Map<String, dynamic>>[];

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
        : <Map<String, dynamic>>[];

    final support = _liveSupport.isNotEmpty
        ? _liveSupport.map((s) {
            return {
              'title': (s['title'] ?? 'Support Request').toString(),
              'detail': (s['detail'] ?? '').toString(),
              'priority': (s['priority'] ?? 'Medium').toString(),
            };
          }).toList()
        : <Map<String, dynamic>>[];

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
        : <Map<String, dynamic>>[];

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
                              '${facility['status']} · ${facility['rating'] != null ? '${facility['rating']} / 5 (${facility['ratingCount']})' : 'No ratings yet'}',
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

    final teamContent = RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Text('Manage team', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          const Text('Players saved to your account', style: TextStyle(color: Color(0xFF5D7692))),
          const SizedBox(height: 12),
          ElevatedButton.icon(onPressed: _addTeamMemberDialog, icon: const Icon(Icons.person_add), label: const Text('Add player')),
          const SizedBox(height: 12),
          if (_teamMembers.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('No additional players added yet.'))
          else ..._teamMembers.map((member) => Card(
            child: ListTile(
              leading: CircleAvatar(child: Text((member['name'] ?? 'P').toString().substring(0, 1).toUpperCase())),
              title: Text((member['name'] ?? 'Player').toString()),
              subtitle: const Text('Team player'),
              trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () async {
                await _apiService.removeTeamMember(member['id'] as int);
                if (mounted) setState(() => _teamMembers.removeWhere((item) => item['id'] == member['id']));
              }),
            ),
          )),
        ],
      ),
    );

    final rewardsContent = RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Text('Rewards', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          const Text('Calculated from your confirmed bookings', style: TextStyle(color: Color(0xFF5D7692))),
          const SizedBox(height: 14),
          Card(child: Padding(padding: const EdgeInsets.all(24), child: Column(children: [
            Text('${_rewards['points'] ?? 0}', style: const TextStyle(fontSize: 46, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8))),
            const Text('points available'),
          ]))),
          const SizedBox(height: 12),
          ListTile(title: const Text('Confirmed bookings'), trailing: Text('${_rewards['confirmedBookings'] ?? 0}')),
          ListTile(title: const Text('Completed bookings'), trailing: Text('${_rewards['completedBookings'] ?? 0}')),
          ListTile(title: const Text('Points to next reward'), trailing: Text('${_rewards['pointsToNextReward'] ?? 50}')),
        ],
      ),
    );

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

    final aiWorkflowsContent = RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2DD4BF).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'SE3090 Part 5',
                        style: TextStyle(color: Color(0xFF2DD4BF), fontWeight: FontWeight.w800, fontSize: 11),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Human-in-the-Loop',
                        style: TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.w700, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Autonomous Agentic AI Pipeline',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Decomposes sports objectives across 4 specialized agents with deterministic validation and manager approval gates.',
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _openAIWorkflowDialog,
                  icon: const Icon(Icons.rocket_launch, size: 16),
                  label: const Text('Launch AI Workflow'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_liveWorkflows.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Text('No AI Workflows found. Tap "Launch AI Workflow" to start one.'),
            )
          else
            ..._liveWorkflows.map((w) {
              final status = (w['status'] ?? 'Pending').toString();
              final isPending = status == 'PendingManagerApproval' || status == 'Pending manager approval';
              final isApproved = status == 'Approved';
              final isRejected = status == 'Rejected';
              final isRevision = status == 'RevisionRequested' || status == 'Revision requested';
              final isManager = _apiService.currentUser?.role.toLowerCase() == 'admin' ||
                  _apiService.currentUser?.role.toLowerCase() == 'manager';
              final wfId = (w['workflowId'] ?? '').toString();

              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isPending ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0),
                    width: isPending ? 2 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
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
                                w['objective'] ?? 'Domain Objective',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF10233E)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Sport: ${w['facilityType'] ?? ''} • Budget: LKR ${(w['budget'] ?? 0)}',
                                style: const TextStyle(color: Color(0xFF5D7692), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isApproved
                                ? const Color(0xFFD1FAE5)
                                : isRejected
                                    ? const Color(0xFFFEE2E2)
                                    : isRevision
                                        ? const Color(0xFFFEF3C7)
                                        : const Color(0xFFDBEAFE),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            isPending
                                ? '⏳ Gated (Review)'
                                : isApproved
                                    ? '✓ Approved'
                                    : isRejected
                                        ? '✕ Rejected'
                                        : isRevision
                                            ? '🔄 Revision'
                                            : status,
                            style: TextStyle(
                              color: isApproved
                                  ? const Color(0xFF0F766E)
                                  : isRejected
                                      ? const Color(0xFFB91C1C)
                                      : isRevision
                                          ? const Color(0xFFB45309)
                                          : const Color(0xFF1D4ED8),
                              fontWeight: FontWeight.w700,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Text(
                      'Facility: ${w['proposalJson'] != null ? _workflowFacilityName(w) : (w['facilityType'] ?? 'Sport facility')}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF10233E)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Requested: ${_workflowWindow(w)} • Participants: ${w['guests'] ?? 0} Guests',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF5D7692)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Quotation / Budget: LKR ${w['budget'] ?? 0}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF5D7692)),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '4-Agent Specialized Pipeline:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF10233E)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _agentChip('🧭 1. Planner', true),
                        _agentChip('🏟️ 2. Analyst', true),
                        _agentChip('🛡️ 3. Validator', true),
                        _agentChip('⚡ 4. Executor', isApproved || isPending),
                      ],
                    ),
                    if (w['finalOutcome'] != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Outcome: ${w['finalOutcome']}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                        ),
                      ),
                    ],
                    if (isManager && (isPending || isRevision)) ...[
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _openWorkflowActionDialog(wfId, 'revise'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFD97706),
                                side: const BorderSide(color: Color(0xFFFBBF24)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Revise', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _openWorkflowActionDialog(wfId, 'reject'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFDC2626),
                                side: const BorderSide(color: Color(0xFFF87171)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Reject', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => _openWorkflowActionDialog(wfId, 'approve'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Approve', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              );
            }),
        ],
      ),
    );

    final tabContent = switch (_selectedTab) {
      1 => bookingsContent,
      2 => facilitiesContent,
      3 => aiWorkflowsContent,
      4 => profileContent,
      5 => teamContent,
      6 => rewardsContent,
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
          BottomNavigationBarItem(icon: Icon(Icons.auto_awesome_rounded), label: 'AI Agent'),
          BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
          BottomNavigationBarItem(icon: Icon(Icons.groups_rounded), label: 'Team'),
          BottomNavigationBarItem(icon: Icon(Icons.card_giftcard_rounded), label: 'Rewards'),
        ],
      ),
    );
  }

  String _workflowFacilityName(Map<String, dynamic> workflow) {
    try {
      final proposal = jsonDecode(workflow['proposalJson'].toString()) as Map<String, dynamic>;
      return (proposal['facilityName'] ?? workflow['facilityType'] ?? 'Sport facility').toString();
    } catch (_) {
      return (workflow['facilityType'] ?? 'Sport facility').toString();
    }
  }

  String _workflowWindow(Map<String, dynamic> workflow) {
    final value = workflow['requestedStart']?.toString();
    if (value == null || value.isEmpty) return 'Not specified';
    return value.replaceFirst('T', ' ').replaceFirst(RegExp(r'\.\d+Z$'), ' UTC');
  }

  Widget _agentChip(String label, bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: active ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
        border: Border.all(color: active ? const Color(0xFF93C5FD) : const Color(0xFFCBD5E1)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: active ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
        ),
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
