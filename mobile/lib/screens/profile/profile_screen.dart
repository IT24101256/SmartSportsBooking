import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../services/saved_cards_service.dart';
import '../../theme/app_theme.dart';
import '../admin/revenue_screen.dart';
import '../admin/equipments_screen.dart';
import '../admin/members_screen.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback onLogout;
  final VoidCallback onConfigureServer;

  const ProfileScreen({super.key, required this.onLogout, required this.onConfigureServer});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _apiService = ApiService();

  void _showChangePasswordDialog() {
    final currentPassCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    final confirmPassCtrl = TextEditingController();
    bool isSaving = false;
    String? error;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('Change Password'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: currentPassCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Current Password', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: newPassCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New Password (min 8 chars)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmPassCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm New Password', border: OutlineInputBorder()),
                ),
                if (error != null) ...[
                  const SizedBox(height: 10),
                  Text(error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isSaving
                  ? null
                  : () async {
                      if (newPassCtrl.text != confirmPassCtrl.text) {
                        setDlgState(() => error = 'New passwords do not match.');
                        return;
                      }
                      if (newPassCtrl.text.length < 8) {
                        setDlgState(() => error = 'Password must be at least 8 characters long.');
                        return;
                      }

                      setDlgState(() => isSaving = true);
                      try {
                        await _apiService.changePassword(
                          currentPassword: currentPassCtrl.text,
                          newPassword: newPassCtrl.text,
                        );
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Password changed successfully!')),
                        );
                      } catch (err) {
                        setDlgState(() {
                          isSaving = false;
                          error = err.toString().replaceAll('Exception: ', '');
                        });
                      }
                    },
              child: isSaving
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Update Password'),
            ),
          ],
        ),
      ),
    );
  }

  void _showSavedCardsSheet() async {
    List<SavedCard> cards = await SavedCardsService().getCards();
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('PAYMENT SETTINGS', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: AppTheme.primary, letterSpacing: 0.5)),
                      Text('Saved Payment Cards', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading)),
                    ],
                  ),
                  IconButton(icon: const Icon(Icons.close, color: AppTheme.textMuted), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      if (cards.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(28),
                          alignment: Alignment.center,
                          child: const Text('No saved payment cards yet.', style: TextStyle(color: AppTheme.textMuted)),
                        )
                      else
                        ...cards.map((c) => Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: c.isDefault ? AppTheme.primary : AppTheme.border, width: c.isDefault ? 2 : 1),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryBg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.credit_card_rounded, color: AppTheme.primary, size: 24),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text('${c.brand} •••• ${c.lastFour}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading)),
                                        if (c.isDefault) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(color: AppTheme.successBg, borderRadius: BorderRadius.circular(6)),
                                            child: const Text('Default', style: TextStyle(color: AppTheme.successDark, fontSize: 10, fontWeight: FontWeight.w800)),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text('${c.cardholderName} • Expires ${c.expiryMonth}/${c.expiryYear}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                  ],
                                ),
                              ),
                              if (!c.isDefault)
                                TextButton(
                                  onPressed: () async {
                                    await SavedCardsService().setDefaultCard(c.id);
                                    final updated = await SavedCardsService().getCards();
                                    setSheetState(() => cards = updated);
                                  },
                                  child: const Text('Set Default', style: TextStyle(fontSize: 12)),
                                ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 20, color: AppTheme.danger),
                                onPressed: () async {
                                  await SavedCardsService().deleteCard(c.id);
                                  final updated = await SavedCardsService().getCards();
                                  setSheetState(() => cards = updated);
                                },
                              ),
                            ],
                          ),
                        )),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () => _showAddNewCardDialog((newCard) async {
                  await SavedCardsService().addCard(newCard);
                  final updated = await SavedCardsService().getCards();
                  setSheetState(() => cards = updated);
                }),
                icon: const Icon(Icons.add_card_rounded),
                label: const Text('Add New Payment Card'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddNewCardDialog(Function(SavedCard) onAdded) {
    final numCtrl = TextEditingController();
    final nameCtrl = TextEditingController(text: _apiService.currentUser?.fullName ?? '');
    final monthCtrl = TextEditingController(text: '12');
    final yearCtrl = TextEditingController(text: '2028');
    final cvvCtrl = TextEditingController(text: '123');
    bool isDefault = false;
    String? dlgError;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('Add Payment Card', style: TextStyle(fontWeight: FontWeight.w900)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (dlgError != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppTheme.dangerBg, borderRadius: BorderRadius.circular(10)),
                    child: Text(dlgError!, style: const TextStyle(color: AppTheme.dangerDark, fontSize: 12)),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: numCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Card Number', hintText: '4242 4242 4242 4242', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Cardholder Name', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: monthCtrl,
                        keyboardType: TextInputType.number,
                        maxLength: 2,
                        decoration: const InputDecoration(labelText: 'MM', hintText: '12', border: OutlineInputBorder(), counterText: ''),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: yearCtrl,
                        keyboardType: TextInputType.number,
                        maxLength: 4,
                        decoration: const InputDecoration(labelText: 'YYYY', hintText: '2028', border: OutlineInputBorder(), counterText: ''),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: cvvCtrl,
                        keyboardType: TextInputType.number,
                        maxLength: 3,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'CVV', hintText: '123', border: OutlineInputBorder(), counterText: ''),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: isDefault,
                  dense: true,
                  title: const Text('Set as default payment card', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  onChanged: (val) => setDlgState(() => isDefault = val ?? false),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                final num = numCtrl.text.replaceAll(' ', '');
                if (num.length < 16) {
                  setDlgState(() => dlgError = 'Card number must be 16 digits.');
                  return;
                }
                final last4 = num.substring(num.length - 4);
                final brand = num.startsWith('5') ? 'Mastercard' : (num.startsWith('3') ? 'Amex' : 'Visa');
                final card = SavedCard(
                  id: 'card_${DateTime.now().millisecondsSinceEpoch}',
                  brand: brand,
                  lastFour: last4,
                  cardholderName: nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : 'Athlete Card',
                  expiryMonth: monthCtrl.text.trim(),
                  expiryYear: yearCtrl.text.trim(),
                  isDefault: isDefault,
                  cvvHint: cvvCtrl.text.trim(),
                );

                Navigator.pop(ctx);
                onAdded(card);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Payment card saved to settings!')),
                );
              },
              child: const Text('Save Card'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = _apiService.currentUser;
    final isStaff = user?.isStaffOrAdmin == true;
    final isAdmin = user?.isAdmin == true;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      children: [
        // Profile Hero Header
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), AppTheme.primary],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white24,
                    child: Text(
                      user?.fullName.isNotEmpty == true ? user!.fullName.substring(0, 1).toUpperCase() : 'M',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      user?.role.toUpperCase() ?? 'MEMBER',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 0.5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                user?.fullName.isNotEmpty == true ? user!.fullName : 'Member',
                style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              Text(
                'Member ID #${user?.id ?? 0} • ${user?.email ?? ''}',
                style: const TextStyle(color: Color(0xFFBFDBFE), fontSize: 13),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Personal Information Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Account Information', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.deepHeading)),
              const Divider(height: 24),
              _infoTile('Full Name', user?.fullName ?? ''),
              const Divider(height: 20),
              _infoTile('Email Address', user?.email ?? ''),
              const Divider(height: 20),
              _infoTile('Contact Number', user?.contactNumber.isNotEmpty == true ? user!.contactNumber : 'Not provided'),
              const Divider(height: 20),
              _infoTile('NIC Identification', user?.nicNumber.isNotEmpty == true ? user!.nicNumber : 'Not provided'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Admin Management Tools Section
        if (isStaff) ...[
          const Text('Management Tools', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.deepHeading)),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: AppTheme.successBg, borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.attach_money_rounded, color: AppTheme.successDark),
                  ),
                  title: const Text('Revenue & Financials', style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: const Text('Gross revenue, court vs equipment income', style: TextStyle(fontSize: 12)),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RevenueScreen())),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.sports_tennis_rounded, color: Color(0xFFB45309)),
                  ),
                  title: const Text('Equipment Inventory', style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: const Text('Manage sports equipment & rental stock', style: TextStyle(fontSize: 12)),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EquipmentsScreen())),
                ),
                if (isAdmin) ...[
                  const Divider(height: 1),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.group_outlined, color: AppTheme.primary),
                    ),
                    title: const Text('Registered Members', style: TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: const Text('Directory of active member accounts', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MembersScreen())),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // App Settings & Actions
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.credit_card_rounded, color: AppTheme.primary),
                title: const Text('Saved Payment Cards', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Manage debit & credit cards for fast checkout', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                onTap: _showSavedCardsSheet,
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.lock_reset_rounded, color: AppTheme.primary),
                title: const Text('Change Password', style: TextStyle(fontWeight: FontWeight.w700)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                onTap: _showChangePasswordDialog,
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.dns_rounded, color: AppTheme.primary),
                title: const Text('Configure Backend URL', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(_apiService.baseUrl, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                onTap: widget.onConfigureServer,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Sign Out Button
        ElevatedButton.icon(
          onPressed: widget.onLogout,
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Sign Out of MySpot'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.dangerBg,
            foregroundColor: AppTheme.dangerDark,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          ),
        ),
        const SizedBox(height: 30),
      ],
    );
  }

  Widget _infoTile(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, fontWeight: FontWeight.w600)),
        Text(value, style: const TextStyle(color: AppTheme.deepHeading, fontWeight: FontWeight.w800, fontSize: 13)),
      ],
    );
  }
}
