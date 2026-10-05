import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class SportCategoriesScreen extends StatefulWidget {
  const SportCategoriesScreen({super.key});

  @override
  State<SportCategoriesScreen> createState() => _SportCategoriesScreenState();
}

class _SportCategoriesScreenState extends State<SportCategoriesScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _categories = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final categories = await _apiService.getSportCategories();
      if (mounted) setState(() => _categories = categories);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit({Map<String, dynamic>? category}) async {
    final controller = TextEditingController(text: category?['name']?.toString() ?? '');
    final name = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(category == null ? 'Add Sport Category' : 'Edit Sport Category'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Category name', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (name == null || name.isEmpty) return;

    try {
      if (category == null) {
        await _apiService.createSportCategory(name);
      } else {
        await _apiService.updateSportCategory((category['id'] as num).toInt(), name);
      }
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))));
      }
    }
  }

  Future<void> _delete(Map<String, dynamic> category) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete sport category?'),
        content: Text('Remove "${category['name']}" from the catalog? Categories in use cannot be deleted.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _apiService.deleteSportCategory((category['id'] as num).toInt());
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sport Categories'),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _edit(),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add category'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text('${_categories.length} active categories', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                      const SizedBox(height: 4),
                      const Text('These categories are shared by facilities and equipment.', style: TextStyle(color: AppTheme.textMuted)),
                      const SizedBox(height: 16),
                      ..._categories.asMap().entries.map((entry) {
                        final category = entry.value;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppTheme.primaryBg,
                              child: Text('${entry.key + 1}', style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800)),
                            ),
                            title: Text(category['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: const Text('Available for facilities and equipment'),
                            trailing: PopupMenuButton<String>(
                              onSelected: (value) => value == 'edit' ? _edit(category: category) : _delete(category),
                              itemBuilder: (_) => const [
                                PopupMenuItem(value: 'edit', child: Text('Edit')),
                                PopupMenuItem(value: 'delete', child: Text('Delete')),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
    );
  }
}
