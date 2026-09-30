class RevenueReport {
  final double totalRevenue;
  final double courtRevenue;
  final double equipmentRevenue;
  final int bookingCount;
  final int equipmentTransactionsCount;
  final DateTime fromDate;
  final DateTime toDate;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> equipmentTransactions;

  RevenueReport({
    required this.totalRevenue,
    required this.courtRevenue,
    required this.equipmentRevenue,
    required this.bookingCount,
    required this.equipmentTransactionsCount,
    required this.fromDate,
    required this.toDate,
    this.items = const [],
    this.equipmentTransactions = const [],
  });

  factory RevenueReport.fromJson(Map<String, dynamic> json) {
    List<Map<String, dynamic>> itemsList = [];
    if (json['items'] is List) {
      itemsList = (json['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }

    List<Map<String, dynamic>> eqTransactionsList = [];
    if (json['equipmentTransactions'] is List) {
      eqTransactionsList = (json['equipmentTransactions'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }

    return RevenueReport(
      totalRevenue: json['totalRevenue'] != null ? (json['totalRevenue'] as num).toDouble() : 0.0,
      courtRevenue: json['courtRevenue'] != null ? (json['courtRevenue'] as num).toDouble() : 0.0,
      equipmentRevenue: json['equipmentRevenue'] != null ? (json['equipmentRevenue'] as num).toDouble() : 0.0,
      bookingCount: json['bookingCount'] != null ? (json['bookingCount'] as num).toInt() : 0,
      equipmentTransactionsCount: json['equipmentTransactionsCount'] != null ? (json['equipmentTransactionsCount'] as num).toInt() : 0,
      fromDate: json['fromDate'] != null ? DateTime.tryParse(json['fromDate'].toString()) ?? DateTime.now() : DateTime.now(),
      toDate: json['toDate'] != null ? DateTime.tryParse(json['toDate'].toString()) ?? DateTime.now() : DateTime.now(),
      items: itemsList,
      equipmentTransactions: eqTransactionsList,
    );
  }
}
