import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class MembersScreen extends StatefulWidget {
  const MembersScreen({super.key});

  @override
  State<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends State<MembersScreen> {
  final ApiService _apiService = ApiService();

  List<Map<String, dynamic>> _members = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  Future<void> _loadMembers() async {
    setState(() => _isLoading = true);
    try {
      final list = await _apiService.getMembers();
      if (mounted) {
        setState(() {
          _members = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registered Members'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadMembers),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadMembers,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                children: [
                  Text('Active Accounts (${_members.length})', style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.textMuted, fontSize: 13)),
                  const SizedBox(height: 12),
                  if (_members.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      alignment: Alignment.center,
                      child: const Text('No member accounts found.', style: TextStyle(color: AppTheme.textMuted)),
                    )
                  else
                    ..._members.map((m) {
                      final name = m['name']?.toString() ?? 'Member';
                      final email = m['email']?.toString() ?? '';
                      final role = m['role']?.toString() ?? 'Customer';
                      final phone = m['contactNumber']?.toString() ?? '';
                      final nic = m['nicNumber']?.toString() ?? '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: AppTheme.primaryBg,
                              child: Text(
                                name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'M',
                                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800),
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
                                      Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.deepHeading)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: role.toLowerCase() == 'admin' ? AppTheme.dangerBg : AppTheme.primaryBg,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          role,
                                          style: TextStyle(
                                            color: role.toLowerCase() == 'admin' ? AppTheme.dangerDark : AppTheme.primary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(email, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                  if (phone.isNotEmpty || nic.isNotEmpty)
                                    Text('📞 $phone • 🪪 $nic', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
