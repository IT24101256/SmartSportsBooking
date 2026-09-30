import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../models/revenue.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class RevenueScreen extends StatefulWidget {
  const RevenueScreen({super.key});

  @override
  State<RevenueScreen> createState() => _RevenueScreenState();
}

class _RevenueScreenState extends State<RevenueScreen> {
  final ApiService _apiService = ApiService();

  RevenueReport? _report;
  bool _isLoading = true;
  String? _error;
  String _activeTab = 'all'; // 'all', 'court', 'equipment'

  @override
  void initState() {
    super.initState();
    _loadRevenue();
  }

  Future<void> _loadRevenue() async {
    setState(() => _isLoading = true);
    try {
      final r = await _apiService.getRevenue();
      if (mounted) {
        setState(() {
          _report = r;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  Future<void> _downloadRevenueReportPdf() async {
    if (_report == null) return;
    final currencyFmt = NumberFormat('#,##0', 'en_US');
    final now = DateTime.now();
    final dateStr = DateFormat('yyyy-MM-dd HH:mm').format(now);
    final user = _apiService.currentUser;

    final doc = pw.Document();

    final facilityTotals = <String, double>{};
    for (final it in _report!.items) {
      final fac = it['facility']?.toString() ?? 'Court Facility';
      final amt = it['totalAmount'] != null ? (it['totalAmount'] as num).toDouble() : 0.0;
      facilityTotals[fac] = (facilityTotals[fac] ?? 0.0) + amt;
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context ctx) {
          return [
            // Company Header
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('MySpot', style: pw.TextStyle(fontSize: 26, fontWeight: pw.FontWeight.bold, color: PdfColors.teal800)),
                    pw.Text('Smart Sports Facility & Equipment Rental Platform', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                    pw.SizedBox(height: 4),
                    pw.Text('OFFICIAL FINANCIAL AUDIT REPORT', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.grey900)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text('Report Date: $dateStr', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                    pw.Text('Audited By: ${user?.fullName ?? 'Management'} (${user?.role ?? 'Staff'})', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                  ],
                ),
              ],
            ),
            pw.SizedBox(height: 14),
            pw.Divider(color: PdfColors.grey400, thickness: 1),
            pw.SizedBox(height: 12),

            // Summary Metric Boxes
            pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(12),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.teal50,
                      borderRadius: pw.BorderRadius.circular(8),
                      border: pw.Border.all(color: PdfColors.teal300),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('TOTAL GROSS REVENUE', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900)),
                        pw.SizedBox(height: 4),
                        pw.Text('LKR ${currencyFmt.format(_report!.totalRevenue)}', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 8),
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(12),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.blue50,
                      borderRadius: pw.BorderRadius.circular(8),
                      border: pw.Border.all(color: PdfColors.blue300),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('COURT HIRE REVENUE', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                        pw.SizedBox(height: 4),
                        pw.Text('LKR ${currencyFmt.format(_report!.courtRevenue)}', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 8),
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(12),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.amber50,
                      borderRadius: pw.BorderRadius.circular(8),
                      border: pw.Border.all(color: PdfColors.amber300),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('EQUIPMENT HIRE REVENUE', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.amber900)),
                        pw.SizedBox(height: 4),
                        pw.Text('LKR ${currencyFmt.format(_report!.equipmentRevenue)}', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.amber900)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 18),

            // Facility Breakdown
            pw.Text('FACILITY REVENUE BREAKDOWN', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.grey900)),
            pw.SizedBox(height: 6),
            pw.TableHelper.fromTextArray(
              headers: ['Facility Name', 'Recorded Court Revenue'],
              data: facilityTotals.entries.map((e) => [e.key, 'LKR ${currencyFmt.format(e.value)}']).toList(),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.teal800),
              cellStyle: const pw.TextStyle(fontSize: 9),
              cellPadding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            ),
            pw.SizedBox(height: 18),

            // Equipment Transactions Section
            if (_report!.equipmentTransactions.isNotEmpty) ...[
              pw.Text('EQUIPMENT RENTAL TRANSACTIONS (${_report!.equipmentTransactions.length})', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.grey900)),
              pw.SizedBox(height: 6),
              pw.TableHelper.fromTextArray(
                headers: ['Equipment', 'Qty', 'Hours', 'Rate/h', 'Customer', 'Staff Collector', 'Amount'],
                data: _report!.equipmentTransactions.map((t) => [
                  t['equipmentName']?.toString() ?? 'Equipment',
                  t['quantity']?.toString() ?? '1',
                  t['hours']?.toString() ?? '1',
                  'LKR ${currencyFmt.format(t['hourlyRate'] ?? 0)}',
                  t['customer']?.toString() ?? 'Member',
                  t['collectedBy']?.toString() ?? 'Staff',
                  'LKR ${currencyFmt.format(t['totalAmount'] ?? 0)}',
                ]).toList(),
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.amber800),
                cellStyle: const pw.TextStyle(fontSize: 9),
                cellPadding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              ),
              pw.SizedBox(height: 18),
            ],

            // Court Booking Transactions Section
            pw.Text('COURT BOOKINGS LIST (${_report!.items.length})', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.grey900)),
            pw.SizedBox(height: 6),
            pw.TableHelper.fromTextArray(
              headers: ['ID', 'Facility', 'Customer', 'Payment Method', 'Status', 'Total Amount'],
              data: _report!.items.take(40).map((it) => [
                '#${it['id'] ?? ''}',
                it['facility']?.toString() ?? '',
                it['customer']?.toString() ?? '',
                it['paymentMethod']?.toString() ?? 'Card',
                it['paymentStatus']?.toString() ?? 'Paid',
                'LKR ${currencyFmt.format(it['totalAmount'] ?? 0)}',
              ]).toList(),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey800),
              cellStyle: const pw.TextStyle(fontSize: 9),
              cellPadding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
      name: 'MySpot_Revenue_Report_${DateFormat('yyyyMMdd').format(now)}.pdf',
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'en_US');

    final courtItems = _report?.items ?? [];
    final eqItems = _report?.equipmentTransactions ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Revenue & Financials'),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_rounded),
            tooltip: 'Download PDF Report',
            onPressed: _report != null ? _downloadRevenueReportPdf : null,
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadRevenue),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadRevenue,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                children: [
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(color: AppTheme.dangerBg, borderRadius: BorderRadius.circular(12)),
                      child: Text(_error!, style: const TextStyle(color: AppTheme.dangerDark, fontSize: 13)),
                    ),

                  // Total Revenue Hero Card
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F766E), Color(0xFF047857), Color(0xFF065F46)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF047857).withValues(alpha: 0.25),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'TOTAL GROSS REVENUE (MTD)',
                              style: TextStyle(color: Color(0xFFD1FAE5), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(10)),
                              child: const Text('MySpot Financials', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'LKR ${currencyFmt.format(_report?.totalRevenue ?? 0)}',
                          style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${_report?.bookingCount ?? courtItems.length} Court Sessions • ${_report?.equipmentTransactionsCount ?? eqItems.length} Equipment Rentals',
                          style: const TextStyle(color: Color(0xFFA7F3D0), fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Revenue Breakdown Row
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.stadium_outlined, color: AppTheme.primary, size: 22),
                              const SizedBox(height: 8),
                              Text(
                                'LKR ${currencyFmt.format(_report?.courtRevenue ?? 0)}',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.deepHeading),
                              ),
                              const SizedBox(height: 2),
                              const Text('Court Hire Revenue', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.sports_tennis_rounded, color: Color(0xFFF59E0B), size: 22),
                              const SizedBox(height: 8),
                              Text(
                                'LKR ${currencyFmt.format(_report?.equipmentRevenue ?? 0)}',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFFB45309)),
                              ),
                              const SizedBox(height: 2),
                              const Text('Equipment Hire', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Transactions Filter Tabs
                  Row(
                    children: [
                      _buildTabChip('all', 'All (${courtItems.length + eqItems.length})'),
                      const SizedBox(width: 8),
                      _buildTabChip('court', 'Courts (${courtItems.length})'),
                      const SizedBox(width: 8),
                      _buildTabChip('equipment', 'Equipment (${eqItems.length})'),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Equipment Rental Transactions (if active tab is all or equipment)
                  if (_activeTab == 'all' || _activeTab == 'equipment') ...[
                    if (eqItems.isNotEmpty) ...[
                      const Text(
                        'Equipment Rental Income',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFFB45309)),
                      ),
                      const SizedBox(height: 8),
                      ...eqItems.map((eq) {
                        final eqName = eq['equipmentName']?.toString() ?? 'Equipment';
                        final qty = eq['quantity'] ?? 1;
                        final hrs = eq['hours'] ?? 1;
                        final cust = eq['customer']?.toString() ?? 'Member';
                        final amt = eq['totalAmount'] != null ? (eq['totalAmount'] as num).toDouble() : 0.0;
                        final staff = eq['collectedBy']?.toString() ?? 'Staff';
                        final method = eq['paymentMethod']?.toString() ?? 'Cash';
                        final status = eq['paymentStatus']?.toString() ?? 'Paid';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(12)),
                                child: const Icon(Icons.sports_tennis_rounded, color: Color(0xFFB45309), size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '$eqName (x$qty)',
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '$cust • ${hrs}h • $method ($status)',
                                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                    ),
                                    Text(
                                      'Staff: $staff',
                                      style: const TextStyle(color: Color(0xFFB45309), fontSize: 11, fontStyle: FontStyle.italic),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '+ LKR ${currencyFmt.format(amt)}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFFB45309)),
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 14),
                    ] else if (_activeTab == 'equipment') ...[
                      Container(
                        padding: const EdgeInsets.all(24),
                        alignment: Alignment.center,
                        child: const Text('No equipment rental transactions recorded yet.', style: TextStyle(color: AppTheme.textMuted)),
                      ),
                    ],
                  ],

                  // Court Booking Transactions (if active tab is all or court)
                  if (_activeTab == 'all' || _activeTab == 'court') ...[
                    if (courtItems.isNotEmpty) ...[
                      const Text(
                        'Court Reservation Revenue',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.deepHeading),
                      ),
                      const SizedBox(height: 8),
                      ...courtItems.take(25).map((item) {
                        final bId = item['id']?.toString() ?? '0';
                        final fac = item['facility']?.toString() ?? 'Facility';
                        final customer = item['customer']?.toString() ?? 'Customer';
                        final amt = item['totalAmount'] != null ? (item['totalAmount'] as num).toDouble() : 0.0;
                        final payMethod = item['paymentMethod']?.toString() ?? 'Card';
                        final payStatus = item['paymentStatus']?.toString() ?? 'Paid';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(color: AppTheme.successBg, borderRadius: BorderRadius.circular(12)),
                                child: const Icon(Icons.arrow_downward_rounded, color: AppTheme.successDark, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      fac,
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '#$bId • $customer • $payMethod ($payStatus)',
                                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '+ LKR ${currencyFmt.format(amt)}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.successDark),
                              ),
                            ],
                          ),
                        );
                      }),
                    ] else if (_activeTab == 'court') ...[
                      Container(
                        padding: const EdgeInsets.all(24),
                        alignment: Alignment.center,
                        child: const Text('No court hire transactions recorded for this period.', style: TextStyle(color: AppTheme.textMuted)),
                      ),
                    ],
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildTabChip(String id, String label) {
    final isSelected = _activeTab == id;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppTheme.deepHeading,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
