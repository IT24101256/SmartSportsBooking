import 'dart:convert';

class FacilityEquipmentItem {
  final String name;
  final double? hourlyRate;

  FacilityEquipmentItem({required this.name, this.hourlyRate});

  factory FacilityEquipmentItem.fromDynamic(dynamic item) {
    if (item is Map<String, dynamic>) {
      return FacilityEquipmentItem(
        name: item['name']?.toString() ?? '',
        hourlyRate: item['hourlyRate'] != null ? (item['hourlyRate'] as num).toDouble() : null,
      );
    }
    return FacilityEquipmentItem(name: item.toString());
  }
}

class FacilityFaqItem {
  final String question;
  final String answer;

  FacilityFaqItem({required this.question, required this.answer});

  factory FacilityFaqItem.fromJson(Map<String, dynamic> json) {
    return FacilityFaqItem(
      question: json['question']?.toString() ?? json['q']?.toString() ?? '',
      answer: json['answer']?.toString() ?? json['a']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'question': question,
        'answer': answer,
      };
}

class Facility {
  final int id;
  final String name;
  final String type;
  final String courtType;
  final double hourlyRate;
  final bool isAvailable;
  final bool isOccupiedNow;
  final String status;
  final double? rating;
  final int ratingCount;
  final String description;
  final String location;
  final String contactNumber;
  final String openingTime;
  final String closingTime;
  final List<FacilityEquipmentItem> equipments;
  final List<String> images;
  final List<FacilityFaqItem> faq;

  Facility({
    required this.id,
    required this.name,
    required this.type,
    this.courtType = 'Indoor',
    required this.hourlyRate,
    this.isAvailable = true,
    this.isOccupiedNow = false,
    required this.status,
    this.rating,
    this.ratingCount = 0,
    this.description = '',
    this.location = '',
    this.contactNumber = '',
    this.openingTime = '08:00',
    this.closingTime = '24:00',
    this.equipments = const [],
    this.images = const [],
    this.faq = const [],
  });

  bool get isOutdoor =>
      courtType.toLowerCase().contains('outdoor') ||
      name.toLowerCase().contains('turf') ||
      name.toLowerCase().contains('field') ||
      name.toLowerCase().contains('ground');

  String get emoji {
    final lower = '$type $name'.toLowerCase();
    if (lower.contains('foot') || lower.contains('soccer') || lower.contains('turf')) return '⚽';
    if (lower.contains('badminton')) return '🏸';
    if (lower.contains('swim') || lower.contains('aqua')) return '🏊';
    if (lower.contains('tennis') && !lower.contains('table')) return '🎾';
    if (lower.contains('basket')) return '🏀';
    if (lower.contains('gym') || lower.contains('fit')) return '🏋️';
    if (lower.contains('volley')) return '🏐';
    if (lower.contains('cricket')) return '🏏';
    if (lower.contains('table') || lower.contains('ping')) return '🏓';
    if (lower.contains('squash')) return '🎾';
    return '🏟️';
  }

  factory Facility.fromJson(Map<String, dynamic> json) {
    final id = json['id'] is int ? json['id'] as int : int.tryParse(json['id']?.toString() ?? '0') ?? 0;
    final name = json['name']?.toString() ?? 'Facility';
    final type = json['sportCategory']?.toString() ?? json['type']?.toString() ?? 'Sports';
    final courtType = json['courtType']?.toString() ?? json['courtTag']?.toString() ?? 'Indoor';
    final hourlyRate = json['hourlyRate'] != null ? (json['hourlyRate'] as num).toDouble() : 0.0;
    final isAvailable = json['isAvailable'] == true;
    final isOccupiedNow = json['isOccupiedNow'] == true;
    final status = json['status']?.toString() ??
        (isOccupiedNow ? 'In Play' : (isAvailable ? 'Available now' : 'Booked'));
    final rating = json['rating'] != null ? (json['rating'] as num).toDouble() : null;
    final ratingCount = json['ratingCount'] != null ? (json['ratingCount'] as num).toInt() : 0;

    // Parse images
    List<String> parsedImages = [];
    final rawImages = json['images'];
    if (rawImages is List) {
      parsedImages = rawImages.map((e) => e.toString()).toList();
    } else if (rawImages is String && rawImages.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawImages);
        if (decoded is List) parsedImages = decoded.map((e) => e.toString()).toList();
      } catch (_) {}
    }

    // Parse FAQ
    List<FacilityFaqItem> parsedFaq = [];
    final rawFaq = json['faq'];
    if (rawFaq is List) {
      parsedFaq = rawFaq.map((e) => FacilityFaqItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } else if (rawFaq is String && rawFaq.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawFaq);
        if (decoded is List) {
          parsedFaq = decoded.map((e) => FacilityFaqItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
        }
      } catch (_) {}
    }

    // Parse Equipments
    List<FacilityEquipmentItem> parsedEquipments = [];
    final rawEquip = json['equipmentsProvided'];
    if (rawEquip is List) {
      parsedEquipments = rawEquip.map((e) => FacilityEquipmentItem.fromDynamic(e)).toList();
    } else if (rawEquip is String && rawEquip.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawEquip);
        if (decoded is List) {
          parsedEquipments = decoded.map((e) => FacilityEquipmentItem.fromDynamic(e)).toList();
        } else {
          parsedEquipments = rawEquip.split(',').map((s) => FacilityEquipmentItem(name: s.trim())).toList();
        }
      } catch (_) {
        parsedEquipments = rawEquip.split(',').map((s) => FacilityEquipmentItem(name: s.trim())).toList();
      }
    }

    return Facility(
      id: id,
      name: name,
      type: type,
      courtType: courtType,
      hourlyRate: hourlyRate,
      isAvailable: isAvailable,
      isOccupiedNow: isOccupiedNow,
      status: status,
      rating: rating,
      ratingCount: ratingCount,
      description: json['description']?.toString() ?? '',
      location: json['location']?.toString() ?? 'Colombo Sports Hub',
      contactNumber: json['contactNumber']?.toString() ?? '+94 11 234 5678',
      openingTime: json['openingTime']?.toString() ?? '08:00',
      closingTime: json['closingTime']?.toString() ?? '24:00',
      equipments: parsedEquipments,
      images: parsedImages,
      faq: parsedFaq,
    );
  }
}
