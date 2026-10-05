import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/facility.dart';
import '../../models/equipment.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class EditFacilityModal extends StatefulWidget {
  final Facility? facility;
  final VoidCallback onSaved;

  const EditFacilityModal({super.key, this.facility, required this.onSaved});

  static Future<void> show(BuildContext context, Facility? facility, VoidCallback onSaved) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EditFacilityModal(facility: facility, onSaved: onSaved),
    );
  }

  @override
  State<EditFacilityModal> createState() => _EditFacilityModalState();
}

class _EditFacilityModalState extends State<EditFacilityModal> {
  final ApiService _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();

  late TextEditingController _nameCtrl;
  late TextEditingController _rateCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _equipCtrl;
  late String _sportCategory;
  late String _courtType;
  late bool _isAvailable;

  List<String> _images = [];
  List<FacilityFaqItem> _faqs = [];
  List<Equipment> _masterEquipments = [];

  bool _isSaving = false;
  String? _error;

  List<String> _sportCategories = [];

  @override
  void initState() {
    super.initState();
    final f = widget.facility;
    _nameCtrl = TextEditingController(text: f?.name ?? '');
    _rateCtrl = TextEditingController(text: (f?.hourlyRate ?? 2500).toInt().toString());
    _descCtrl = TextEditingController(text: f?.description ?? '');
    _equipCtrl = TextEditingController(
      text: f != null ? f.equipments.map((e) => e.name).join(', ') : '',
    );

    _sportCategory = f?.type.isNotEmpty == true ? f!.type : 'Badminton';

    _courtType = (f != null && f.courtType.isNotEmpty) ? f.courtType : 'Indoor';
    _isAvailable = f?.isAvailable ?? true;
    _images = f != null ? List<String>.from(f.images) : [];
    _faqs = f != null ? List<FacilityFaqItem>.from(f.faq) : [];

    _loadSportCategories();
    _loadMasterEquipments();
  }

  Future<void> _loadSportCategories() async {
    try {
      const defaults = ['Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball'];
      final categories = await _apiService.getSportCategories();
      if (mounted) {
        setState(() {
          _sportCategories = {...defaults, ...categories, _sportCategory}
              .where((category) => category != 'Indoor' && category != 'Outdoor')
              .toList();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _sportCategories = {
          'Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball', _sportCategory,
        }.toList());
      }
    }
  }

  Future<void> _loadMasterEquipments() async {
    try {
      final list = await _apiService.getEquipments();
      if (mounted) {
        setState(() {
          _masterEquipments = list;
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _rateCtrl.dispose();
    _descCtrl.dispose();
    _equipCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    if (_images.length >= 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maximum 6 facility photos allowed.')),
      );
      return;
    }

    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 82,
      );

      if (file == null) return;

      final bytes = await file.readAsBytes();
      final base64String = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      setState(() {
        _images.add(base64String);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking photo: $e')),
        );
      }
    }
  }

  void _showAddPhotoOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Add Facility Photo', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: AppTheme.deepHeading)),
              const SizedBox(height: 14),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.photo_library_rounded, color: AppTheme.primary),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Select a high-resolution photo from device', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFFB45309)),
                ),
                title: const Text('Take with Camera', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Snap a new venue photo directly', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.purpleBg, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.link_rounded, color: AppTheme.purple),
                ),
                title: const Text('Enter Image URL', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Link to an online image URL', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showAddUrlDialog();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddUrlDialog() {
    final urlCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text('Add Image URL', style: TextStyle(fontWeight: FontWeight.w900)),
        content: TextField(
          controller: urlCtrl,
          decoration: const InputDecoration(labelText: 'Image Web Address (URL)', hintText: 'https://...', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final url = urlCtrl.text.trim();
              if (url.isNotEmpty) {
                setState(() => _images.add(url));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Add Photo'),
          ),
        ],
      ),
    );
  }

  void _showAddFaqDialog() {
    final qCtrl = TextEditingController();
    final aCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text('Add Facility FAQ', style: TextStyle(fontWeight: FontWeight.w900)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: qCtrl,
              decoration: const InputDecoration(labelText: 'Question', hintText: 'e.g. Are shoes required?', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: aCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Answer', hintText: 'e.g. Non-marking court shoes only.', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (qCtrl.text.trim().isNotEmpty && aCtrl.text.trim().isNotEmpty) {
                setState(() {
                  _faqs.add(FacilityFaqItem(question: qCtrl.text.trim(), answer: aCtrl.text.trim()));
                });
              }
              Navigator.pop(ctx);
            },
            child: const Text('Add Question'),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoThumbnail(String src, int index) {
    Widget imgWidget;
    if (src.startsWith('data:image')) {
      try {
        final commaIdx = src.indexOf(',');
        final base64Str = commaIdx != -1 ? src.substring(commaIdx + 1) : src;
        imgWidget = Image.memory(base64Decode(base64Str), fit: BoxFit.cover, width: 84, height: 84);
      } catch (_) {
        imgWidget = Container(color: Colors.grey.shade200, width: 84, height: 84, child: const Icon(Icons.broken_image));
      }
    } else if (src.startsWith('http')) {
      imgWidget = Image.network(
        src,
        fit: BoxFit.cover,
        width: 84,
        height: 84,
        errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey.shade200, width: 84, height: 84, child: const Icon(Icons.broken_image)),
      );
    } else {
      imgWidget = Image.asset(
        src,
        fit: BoxFit.cover,
        width: 84,
        height: 84,
        errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey.shade200, width: 84, height: 84, child: const Icon(Icons.image)),
      );
    }

    return Stack(
      children: [
        Container(
          width: 84,
          height: 84,
          margin: const EdgeInsets.only(right: 10, top: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(13),
            child: imgWidget,
          ),
        ),
        Positioned(
          top: 0,
          right: 6,
          child: GestureDetector(
            onTap: () => setState(() => _images.removeAt(index)),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: AppTheme.danger,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, size: 12, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleSave() async {
    final name = _nameCtrl.text.trim();
    final rate = double.tryParse(_rateCtrl.text.trim()) ?? 0;
    if (name.isEmpty) {
      setState(() => _error = 'Facility name cannot be empty.');
      return;
    }
    if (rate <= 0) {
      setState(() => _error = 'Please enter a valid hourly rate.');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final isNew = widget.facility == null;
      final payload = <String, dynamic>{
        if (!isNew) 'id': widget.facility!.id,
        'name': name,
        'type': _sportCategory,
        'hourlyRate': rate,
        'courtType': _courtType,
        'isAvailable': _isAvailable,
        'description': _descCtrl.text.trim(),
        'equipmentsProvided': _equipCtrl.text.trim(),
        'faq': _faqs.map((f) => f.toJson()).toList(),
        'images': _images,
      };

      await _apiService.saveFacility(payload, id: widget.facility?.id);

      if (mounted) {
        Navigator.pop(context);
        widget.onSaved();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isNew ? 'Facility created successfully!' : 'Facility updated successfully with photos & settings!'),
            backgroundColor: AppTheme.successDark,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.92),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(10)),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('VENUE ADMINISTRATION', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: AppTheme.primary, letterSpacing: 0.5)),
                  Text(widget.facility != null ? 'Edit Facility #${widget.facility!.id}' : 'Add New Facility', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading)),
                ],
              ),
              IconButton(icon: const Icon(Icons.close, color: AppTheme.textMuted), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 12),

          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppTheme.dangerBg, borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AppTheme.danger, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_error!, style: const TextStyle(color: AppTheme.dangerDark, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Facility Name
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(labelText: 'Facility / Court Name', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 14),

                  // Sport Category & Court Setting
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _sportCategory,
                          decoration: const InputDecoration(labelText: 'Sport Category', border: OutlineInputBorder()),
                          items: (_sportCategories.isEmpty ? <String>[_sportCategory] : _sportCategories)
                              .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                              .toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _sportCategory = val);
                          },
                        ),
                      ),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _courtType,
                          decoration: const InputDecoration(labelText: 'Court Setting', border: OutlineInputBorder()),
                          items: const [
                            DropdownMenuItem(value: 'Indoor', child: Text('Indoor Court')),
                            DropdownMenuItem(value: 'Outdoor', child: Text('Outdoor / Turf')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _courtType = val);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Hourly Rate & Availability Status
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _rateCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Hourly Rate',
                            prefixText: 'LKR ',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Facility Operational Status', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    subtitle: Text(_isAvailable ? 'Available for bookings' : 'Maintenance (Bookings Paused)', style: const TextStyle(fontSize: 12)),
                    value: _isAvailable,
                    activeThumbColor: AppTheme.success,
                    onChanged: (val) => setState(() => _isAvailable = val),
                  ),
                  const Divider(height: 24),

                  // PHOTOS & IMAGES SECTION
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Facility Photos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading)),
                          Text('${_images.length}/6 photos added', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                        ],
                      ),
                      if (_images.length < 6)
                        TextButton.icon(
                          onPressed: _showAddPhotoOptions,
                          icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                          label: const Text('+ Add Photo'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_images.isEmpty)
                    GestureDetector(
                      onTap: _showAddPhotoOptions,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppTheme.scaffoldBg,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
                        ),
                        child: const Column(
                          children: [
                            Icon(Icons.cloud_upload_outlined, size: 36, color: AppTheme.primary),
                            SizedBox(height: 8),
                            Text('Upload Facility Photos', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading)),
                            SizedBox(height: 2),
                            Text('Take photo, choose from gallery, or paste URL', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                          ],
                        ),
                      ),
                    )
                  else
                    SizedBox(
                      height: 94,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          ..._images.asMap().entries.map((entry) => _buildPhotoThumbnail(entry.value, entry.key)),
                          if (_images.length < 6)
                            GestureDetector(
                              onTap: _showAddPhotoOptions,
                              child: Container(
                                width: 84,
                                height: 84,
                                margin: const EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.scaffoldBg,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
                                ),
                                child: const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.add_a_photo_outlined, size: 24, color: AppTheme.primary),
                                    SizedBox(height: 4),
                                    Text('Add', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  const Divider(height: 28),

                  // DESCRIPTION
                  TextField(
                    controller: _descCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Facility Description',
                      hintText: 'Highlight court surface, lighting, seating, and features...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // EQUIPMENTS PROVIDED
                  TextField(
                    controller: _equipCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Equipment Provided (Free or default equipment)',
                      hintText: 'e.g. Badminton Rackets, Feather Shuttles, Court Net',
                      border: OutlineInputBorder(),
                    ),
                  ),

                  // Quick equipment suggestion chips from inventory
                  if (_masterEquipments.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    const Text('Add from Inventory:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _masterEquipments.take(8).map((eq) {
                        final selected = _equipCtrl.text.split(',').map((item) => item.trim()).contains(eq.name);
                        return ActionChip(
                        avatar: Icon(selected ? Icons.check : Icons.add, size: 14, color: selected ? AppTheme.success : AppTheme.primary),
                        label: Text(eq.name, style: const TextStyle(fontSize: 11)),
                        onPressed: () {
                          final current = _equipCtrl.text.trim();
                          if (selected) {
                            _equipCtrl.text = current
                                .split(',')
                                .map((item) => item.trim())
                                .where((item) => item != eq.name && item.isNotEmpty)
                                .join(', ');
                          } else if (current.isEmpty) {
                            _equipCtrl.text = eq.name;
                          } else if (!current.contains(eq.name)) {
                            _equipCtrl.text = '$current, ${eq.name}';
                          }
                          setState(() {});
                        },
                        );
                      }).toList(),
                    ),
                  ],
                  const Divider(height: 28),

                  // FAQ SECTION
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Facility FAQs (${_faqs.length})', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading)),
                      TextButton.icon(
                        onPressed: _showAddFaqDialog,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('+ Add FAQ'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  if (_faqs.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppTheme.scaffoldBg, borderRadius: BorderRadius.circular(12)),
                      child: const Row(
                        children: [
                          Icon(Icons.help_outline, size: 16, color: AppTheme.textMuted),
                          SizedBox(width: 8),
                          Text('No questions added yet. Add FAQs to guide players.', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                        ],
                      ),
                    )
                  else
                    ..._faqs.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final f = entry.value;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.scaffoldBg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Q: ${f.question}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
                                  const SizedBox(height: 2),
                                  Text('A: ${f.answer}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: AppTheme.danger),
                              onPressed: () => setState(() => _faqs.removeAt(idx)),
                            ),
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // Footer Save Button
          ElevatedButton.icon(
            onPressed: _isSaving ? null : _handleSave,
            icon: _isSaving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_circle_outline, size: 18),
            label: Text(_isSaving ? 'Saving Changes...' : (widget.facility != null ? 'Save Facility Changes' : 'Create Facility'), style: const TextStyle(fontWeight: FontWeight.w800)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }
}
