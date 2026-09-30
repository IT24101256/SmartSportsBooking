import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../models/facility.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AddEquipmentModal extends StatefulWidget {
  final Booking booking;
  final Facility? facility;
  final VoidCallback onAdded;

  const AddEquipmentModal({super.key, required this.booking, this.facility, required this.onAdded});

  static Future<void> show(BuildContext context, Booking booking, {Facility? facility, required VoidCallback onAdded}) {
    return showDialog(
      context: context,
      builder: (ctx) => AddEquipmentModal(booking: booking, facility: facility, onAdded: onAdded),
    );
  }

  @override
  State<AddEquipmentModal> createState() => _AddEquipmentModalState();
}

class _AddEquipmentModalState extends State<AddEquipmentModal> {
  final ApiService _apiService = ApiService();

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _rateController = TextEditingController(text: '350');
  final TextEditingController _notesController = TextEditingController();

  int _quantity = 1;
  int _hours = 1;
  String _paymentMethod = 'Cash in hand';
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _hours = widget.booking.hoursNeeded > 0 ? widget.booking.hoursNeeded : 1;
    if (widget.facility != null && widget.facility!.equipments.isNotEmpty) {
      _nameController.text = widget.facility!.equipments.first.name;
      if (widget.facility!.equipments.first.hourlyRate != null) {
        _rateController.text = widget.facility!.equipments.first.hourlyRate!.toInt().toString();
      }
    } else {
      _nameController.text = 'Professional Rackets (Pair)';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _rateController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  double get _totalAmount {
    final rate = double.tryParse(_rateController.text.trim()) ?? 0.0;
    return rate * _quantity * _hours;
  }

  Future<void> _handleSubmit() async {
    final name = _nameController.text.trim();
    final rate = double.tryParse(_rateController.text.trim()) ?? 0.0;

    if (name.isEmpty) {
      setState(() => _error = 'Please enter an equipment name.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await _apiService.addAdditionalEquipment(
        bookingId: widget.booking.id,
        equipmentName: name,
        quantity: _quantity,
        hourlyRate: rate,
        hours: _hours,
        paymentMethod: _paymentMethod,
        notes: _notesController.text.trim(),
      );

      if (mounted) {
        Navigator.pop(context);
        widget.onAdded();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Equipment added! Collected LKR ${NumberFormat('#,##0').format(_totalAmount)}')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'en_US');

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.sports_tennis_rounded, color: Color(0xFFB45309), size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'On-Site Equipment Rental',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.deepHeading),
                      ),
                      Text(
                        'Record payment & add gear to booking',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Facility presets if available
            if (widget.facility != null && widget.facility!.equipments.isNotEmpty) ...[
              const Text('Quick Select Available Gear:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.deepHeading)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.facility!.equipments.map((eq) {
                  final isSelected = _nameController.text == eq.name;
                  return ChoiceChip(
                    label: Text(eq.name),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) {
                        setState(() {
                          _nameController.text = eq.name;
                          if (eq.hourlyRate != null) {
                            _rateController.text = eq.hourlyRate!.toInt().toString();
                          }
                        });
                      }
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
            ],

            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Equipment / Item Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _rateController,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(labelText: 'Rate / Hour (LKR)', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Quantity', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          IconButton(
                            onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                            icon: const Icon(Icons.remove_circle_outline),
                            visualDensity: VisualDensity.compact,
                          ),
                          Text('$_quantity', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          IconButton(
                            onPressed: () => setState(() => _quantity++),
                            icon: const Icon(Icons.add_circle_outline),
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            Row(
              children: [
                const Text('Duration (Hours):', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(width: 10),
                IconButton(
                  onPressed: _hours > 1 ? () => setState(() => _hours--) : null,
                  icon: const Icon(Icons.remove_circle_outline),
                  visualDensity: VisualDensity.compact,
                ),
                Text('$_hours hr', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                IconButton(
                  onPressed: () => setState(() => _hours++),
                  icon: const Icon(Icons.add_circle_outline),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 14),

            const Text('Payment Method:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.money, size: 16), SizedBox(width: 6), Text('Cash in hand')]),
                    selected: _paymentMethod == 'Cash in hand',
                    onSelected: (_) => setState(() => _paymentMethod = 'Cash in hand'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.credit_card, size: 16), SizedBox(width: 6), Text('Card (POS)')]),
                    selected: _paymentMethod == 'Card (Machine)',
                    onSelected: (_) => setState(() => _paymentMethod = 'Card (Machine)'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Live total calculation box
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.primaryBg,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total to Collect:', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
                  Text(
                    'LKR ${currencyFmt.format(_totalAmount)}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.primary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
            ),

            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
            ],

            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handleSubmit,
              child: _isSubmitting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Record Payment & Issue Gear'),
            ),
          ],
        ),
      ),
    );
  }
}
