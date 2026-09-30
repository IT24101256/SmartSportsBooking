class Equipment {
  final int id;
  final String name;
  final String sportCategory;
  final double hourlyRate;
  final int? facilityId;
  final String? facilityName;
  final int totalStock;
  final String description;
  final bool isAvailable;

  Equipment({
    required this.id,
    required this.name,
    required this.sportCategory,
    required this.hourlyRate,
    this.facilityId,
    this.facilityName,
    required this.totalStock,
    this.description = '',
    this.isAvailable = true,
  });

  String get emoji {
    final lower = '$sportCategory $name'.toLowerCase();
    if (lower.contains('racket') || lower.contains('shuttlecock') || lower.contains('badminton')) return '🏸';
    if (lower.contains('basketball')) return '🏀';
    if (lower.contains('bat') || lower.contains('cricket') || lower.contains('stump')) return '🏏';
    if (lower.contains('football') || lower.contains('soccer')) return '⚽';
    if (lower.contains('tennis')) return '🎾';
    if (lower.contains('swim') || lower.contains('goggle') || lower.contains('kickboard')) return '🏊';
    if (lower.contains('table') || lower.contains('paddle') || lower.contains('ping')) return '🏓';
    if (lower.contains('volley')) return '🏐';
    if (lower.contains('glove')) return '🧤';
    if (lower.contains('vest') || lower.contains('bib')) return '🎽';
    if (lower.contains('cone') || lower.contains('ladder')) return '📐';
    return '⚡';
  }

  factory Equipment.fromJson(Map<String, dynamic> json) {
    return Equipment(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? 'Equipment',
      sportCategory: json['sportCategory']?.toString() ?? 'General',
      hourlyRate: json['hourlyRate'] != null ? (json['hourlyRate'] as num).toDouble() : 0.0,
      facilityId: json['facilityId'] != null ? int.tryParse(json['facilityId'].toString()) : null,
      facilityName: json['facilityName']?.toString() ?? (json['facility'] is Map ? json['facility']['name']?.toString() : null),
      totalStock: json['totalStock'] != null ? (json['totalStock'] as num).toInt() : 10,
      description: json['description']?.toString() ?? '',
      isAvailable: json['isAvailable'] == true,
    );
  }
}
