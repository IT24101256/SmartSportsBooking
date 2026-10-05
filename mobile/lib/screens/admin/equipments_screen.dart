import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/equipment.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class EquipmentsScreen extends StatefulWidget {
  const EquipmentsScreen({super.key});

  @override
  State<EquipmentsScreen> createState() => _EquipmentsScreenState();
}

class _EquipmentsScreenState extends State<EquipmentsScreen> {
  final ApiService _apiService = ApiService();

  List<Equipment> _equipments = [];
  bool _isLoading = true;
  String _selectedSport = 'All';

  List<String> _sports = ['All'];

  @override
  void initState() {
    super.initState();
    _loadSportCategories();
    _loadEquipments();
  }

  Future<void> _loadSportCategories() async {
    try {
      const defaults = ['Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball'];
      final categories = await _apiService.getSportCategories();
      if (mounted) setState(() => _sports = ['All', ...{...defaults, ...categories}]);
    } catch (_) {
      if (mounted) setState(() => _sports = ['All', 'Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball']);
    }
  }

  Future<void> _loadEquipments() async {
    setState(() => _isLoading = true);
    try {
      final list = await _apiService.getEquipments(sportCategory: _selectedSport);
      if (mounted) {
        setState(() {
          _equipments = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showEquipmentDialog({Equipment? existing}) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final rateCtrl = TextEditingController(text: existing != null ? existing.hourlyRate.toInt().toString() : '300');
    final stockCtrl = TextEditingController(text: existing != null ? existing.totalStock.toString() : '10');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    String sportCat = existing?.sportCategory ?? (_selectedSport != 'All' ? _selectedSport : 'Badminton');
    bool isAvail = existing?.isAvailable ?? true;
    bool isSaving = false;
    String? dlgError;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(existing != null ? 'Edit Equipment' : 'Add New Equipment', style: const TextStyle(fontWeight: FontWeight.w900)),
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
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Equipment Name', hintText: 'e.g. Yonex Nanoflare Racket', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _sports.contains(sportCat) && sportCat != 'All' ? sportCat : (_sports.length > 1 ? _sports[1] : null),
                  decoration: const InputDecoration(labelText: 'Sport Category', border: OutlineInputBorder()),
                  items: _sports.where((s) => s != 'All').map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (val) {
                    if (val != null) setDlgState(() => sportCat = val);
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: rateCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Rate / hr (LKR)', prefixText: 'LKR ', border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: stockCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Total Units', border: OutlineInputBorder()),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description / Specs', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Available for Rent', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  value: isAvail,
                  activeThumbColor: AppTheme.success,
                  onChanged: (val) => setDlgState(() => isAvail = val),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isSaving ? null : () async {
                final name = nameCtrl.text.trim();
                final rate = double.tryParse(rateCtrl.text.trim()) ?? 0;
                final stock = int.tryParse(stockCtrl.text.trim()) ?? 0;
                if (name.isEmpty) {
                  setDlgState(() => dlgError = 'Equipment name is required.');
                  return;
                }
                if (rate < 0) {
                  setDlgState(() => dlgError = 'Hourly rate cannot be negative.');
                  return;
                }

                setDlgState(() => isSaving = true);
                try {
                  if (existing != null) {
                    await _apiService.updateEquipment(
                      existing.id,
                      name: name,
                      sportCategory: sportCat,
                      hourlyRate: rate,
                      totalStock: stock,
                      description: descCtrl.text.trim(),
                      isAvailable: isAvail,
                    );
                  } else {
                    await _apiService.createEquipment(
                      name: name,
                      sportCategory: sportCat,
                      hourlyRate: rate,
                      totalStock: stock,
                      description: descCtrl.text.trim(),
                      isAvailable: isAvail,
                    );
                  }
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  _loadEquipments();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(existing != null ? 'Equipment updated!' : 'Equipment added to inventory!')),
                  );
                } catch (e) {
                  setDlgState(() {
                    isSaving = false;
                    dlgError = e.toString().replaceAll('Exception: ', '');
                  });
                }
              },
              child: isSaving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(existing != null ? 'Update' : 'Add Item'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(Equipment eq) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Equipment?'),
        content: Text('Are you sure you want to remove "${eq.name}" from the inventory? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.dangerBg, foregroundColor: AppTheme.dangerDark),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await _apiService.deleteEquipment(eq.id);
                _loadEquipments();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Equipment removed successfully.')),
                  );
                }
              } catch (_) {}
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'en_US');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Equipment Inventory'),
        actions: [
          IconButton(icon: const Icon(Icons.add), tooltip: 'Add Equipment', onPressed: () => _showEquipmentDialog()),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadEquipments),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showEquipmentDialog(),
        icon: const Icon(Icons.add),
        label: const Text('Add Equipment'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEquipments,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                children: [
                  // Sport Filter Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _sports.map((s) {
                        final isSel = _selectedSport == s;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(s),
                            selected: isSel,
                            onSelected: (val) {
                              if (val) {
                                setState(() => _selectedSport = s);
                                _loadEquipments();
                              }
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (_equipments.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      alignment: Alignment.center,
                      child: const Text('No equipment items found.', style: TextStyle(color: AppTheme.textMuted)),
                    )
                  else
                    ..._equipments.map((eq) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(14)),
                              child: Center(child: Text(eq.emoji, style: const TextStyle(fontSize: 24))),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    eq.name,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${eq.sportCategory} • Stock: ${eq.totalStock} units',
                                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'LKR ${currencyFmt.format(eq.hourlyRate)} / hr',
                                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 20, color: AppTheme.primary),
                              tooltip: 'Edit Item',
                              onPressed: () => _showEquipmentDialog(existing: eq),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 20, color: AppTheme.danger),
                              tooltip: 'Delete Item',
                              onPressed: () => _confirmDelete(eq),
                            ),
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: 70), // Padding for FAB
                ],
              ),
            ),
    );
  }
}
