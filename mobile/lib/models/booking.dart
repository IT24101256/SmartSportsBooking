import 'dart:convert';
import 'package:intl/intl.dart';

class EquipmentPaymentItem {
  final int id;
  final int bookingId;
  final String equipmentName;
  final int quantity;
  final double hourlyRate;
  final int hours;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String? collectedBy;
  final String? notes;
  final DateTime? createdAt;

  EquipmentPaymentItem({
    required this.id,
    required this.bookingId,
    required this.equipmentName,
    required this.quantity,
    required this.hourlyRate,
    required this.hours,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    this.collectedBy,
    this.notes,
    this.createdAt,
  });

  factory EquipmentPaymentItem.fromJson(Map<String, dynamic> json) {
    return EquipmentPaymentItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      bookingId: json['bookingId'] is int ? json['bookingId'] : int.tryParse(json['bookingId']?.toString() ?? '0') ?? 0,
      equipmentName: json['equipmentName']?.toString() ?? 'Equipment',
      quantity: json['quantity'] != null ? (json['quantity'] as num).toInt() : 1,
      hourlyRate: json['hourlyRate'] != null ? (json['hourlyRate'] as num).toDouble() : 0.0,
      hours: json['hours'] != null ? (json['hours'] as num).toInt() : 1,
      totalAmount: json['totalAmount'] != null ? (json['totalAmount'] as num).toDouble() : 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? 'Cash in hand',
      paymentStatus: json['paymentStatus']?.toString() ?? 'Paid',
      collectedBy: json['collectedBy']?.toString(),
      notes: json['notes']?.toString(),
      createdAt: json['createdAtUtc'] != null ? DateTime.tryParse(json['createdAtUtc'].toString()) : null,
    );
  }
}

class BookingReviewItem {
  final int id;
  final int bookingId;
  final int userId;
  final String name;
  final int rating;
  final String review;
  final List<String> photoPaths;
  final DateTime? updatedAt;
  final String? facilityName;

  BookingReviewItem({
    required this.id,
    required this.bookingId,
    required this.userId,
    required this.name,
    required this.rating,
    required this.review,
    this.photoPaths = const [],
    this.updatedAt,
    this.facilityName,
  });

  factory BookingReviewItem.fromJson(Map<String, dynamic> json) {
    List<String> photos = [];
    final rawPhotos = json['photos'] ?? json['photoPaths'] ?? json['photoPathsJson'];
    if (rawPhotos is List) {
      photos = rawPhotos.map((e) => e.toString()).toList();
    } else if (rawPhotos is String && rawPhotos.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawPhotos);
        if (decoded is List) photos = decoded.map((e) => e.toString()).toList();
      } catch (_) {}
    }

    return BookingReviewItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      bookingId: json['bookingId'] is int ? json['bookingId'] : int.tryParse(json['bookingId']?.toString() ?? '0') ?? 0,
      userId: json['userId'] is int ? json['userId'] : int.tryParse(json['userId']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? json['userName']?.toString() ?? 'Member',
      rating: json['rating'] != null ? (json['rating'] as num).toInt() : 5,
      review: json['review']?.toString() ?? '',
      photoPaths: photos,
      updatedAt: json['updatedAtUtc'] != null ? DateTime.tryParse(json['updatedAtUtc'].toString()) : null,
      facilityName: json['facilityName']?.toString(),
    );
  }
}

class CancellationQuote {
  final int bookingId;
  final String facilityName;
  final double totalAmount;
  final double hoursPrior;
  final int refundPercentage;
  final double refundAmount;
  final String refundStatus;
  final String policyTier;
  final String policyExplanation;
  final bool isOutdoorEligibleForRainCheck;

  CancellationQuote({
    required this.bookingId,
    required this.facilityName,
    required this.totalAmount,
    required this.hoursPrior,
    required this.refundPercentage,
    required this.refundAmount,
    required this.refundStatus,
    required this.policyTier,
    required this.policyExplanation,
    required this.isOutdoorEligibleForRainCheck,
  });

  factory CancellationQuote.fromJson(Map<String, dynamic> json) {
    return CancellationQuote(
      bookingId: json['bookingId'] is int ? json['bookingId'] : int.tryParse(json['bookingId']?.toString() ?? '0') ?? 0,
      facilityName: json['facilityName']?.toString() ?? 'Facility',
      totalAmount: json['totalAmount'] != null ? (json['totalAmount'] as num).toDouble() : 0.0,
      hoursPrior: json['hoursPrior'] != null ? (json['hoursPrior'] as num).toDouble() : 0.0,
      refundPercentage: json['refundPercentage'] != null ? (json['refundPercentage'] as num).toInt() : 0,
      refundAmount: json['refundAmount'] != null ? (json['refundAmount'] as num).toDouble() : 0.0,
      refundStatus: json['refundStatus']?.toString() ?? 'Non-refundable',
      policyTier: json['policyTier']?.toString() ?? 'Tier 3 (<12h)',
      policyExplanation: json['policyExplanation']?.toString() ?? '',
      isOutdoorEligibleForRainCheck: json['isOutdoorEligibleForRainCheck'] == true,
    );
  }
}

class Booking {
  final int id;
  final int userId;
  final int facilityId;
  final String facilityName;
  final String customerName;
  final String contactNumber;
  final String nicNumber;
  final DateTime bookingDate;
  final String startTime;
  final String endTime;
  final int hoursNeeded;
  final double totalAmount;
  final String status;
  final String paymentMethod;
  final String paymentStatus;
  final String? bankSlipFileName;
  final String? cancellationReason;
  final double? refundAmount;
  final int? refundPercentage;
  final String? refundStatus;
  final DateTime? cancelledAt;
  final DateTime? refundConfirmedAt;
  final String? refundConfirmedBy;
  final String? refundNotes;
  final bool isRescheduleRequested;
  final String? rescheduleReason;
  final DateTime? rescheduleRequestedAt;
  final List<EquipmentPaymentItem> equipmentPayments;
  final BookingReviewItem? review;

  Booking({
    required this.id,
    required this.userId,
    required this.facilityId,
    required this.facilityName,
    required this.customerName,
    this.contactNumber = '',
    this.nicNumber = '',
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    required this.hoursNeeded,
    required this.totalAmount,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    this.bankSlipFileName,
    this.cancellationReason,
    this.refundAmount,
    this.refundPercentage,
    this.refundStatus,
    this.cancelledAt,
    this.refundConfirmedAt,
    this.refundConfirmedBy,
    this.refundNotes,
    this.isRescheduleRequested = false,
    this.rescheduleReason,
    this.rescheduleRequestedAt,
    this.equipmentPayments = const [],
    this.review,
  });

  bool get isConfirmed => status == 'Confirmed';
  bool get isPending => status == 'Pending';
  bool get isCancelled => status == 'Cancelled';
  bool get isRescheduleOffer => isRescheduleRequested || status == 'RescheduleRequested';

  bool get isToRefund =>
      isCancelled &&
      (refundStatus == 'To Refund' || ((refundAmount ?? 0) > 0 && refundStatus != 'Refunded'));

  bool get isRefunded => refundStatus == 'Refunded';

  bool get isExpired {
    try {
      var hStr = endTime.length >= 2 ? endTime.substring(0, 2) : '24';
      if (endTime.startsWith('1.') || endTime.startsWith('24')) {
        hStr = '24';
      }
      final hours = int.tryParse(hStr) ?? 24;
      final minutes = int.tryParse(endTime.length >= 5 ? endTime.substring(3, 5) : '00') ?? 0;
      final sessionEnd = DateTime(
        bookingDate.year,
        bookingDate.month,
        bookingDate.day,
        hours >= 24 ? 23 : hours,
        hours >= 24 ? 59 : minutes,
      );
      return sessionEnd.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  String get gateName {
    final lower = facilityName.toLowerCase();
    if (lower.contains('badminton')) return 'GATE 1 (HALL B)';
    if (lower.contains('cricket')) return 'EAST PAVILION';
    if (lower.contains('turf') || lower.contains('foot')) return 'NORTH TURF';
    if (lower.contains('swim') || lower.contains('aqua')) return 'AQUATICS LOBBY';
    if (lower.contains('basket')) return 'COURT A (FIBA)';
    if (lower.contains('tennis')) return 'CLUBHOUSE';
    return 'MAIN GATE';
  }

  String get formattedDate => DateFormat('EEE, MMM d, yyyy').format(bookingDate);
  String get formattedTimeSlot => '${startTime.length >= 5 ? startTime.substring(0, 5) : startTime} - ${endTime.length >= 5 ? endTime.substring(0, 5) : endTime}';

  factory Booking.fromJson(Map<String, dynamic> json, {BookingReviewItem? attachedReview}) {
    final id = json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0;
    final userId = json['userId'] is int ? json['userId'] : int.tryParse(json['userId']?.toString() ?? '0') ?? 0;
    final facilityId = json['facilityId'] is int ? json['facilityId'] : int.tryParse(json['facilityId']?.toString() ?? '0') ?? 0;

    String facName = 'Facility';
    if (json['facility'] is Map) {
      facName = json['facility']['name']?.toString() ?? 'Facility';
    } else if (json['facilityName'] != null) {
      facName = json['facilityName'].toString();
    }

    DateTime bDate = DateTime.now();
    if (json['bookingDate'] != null) {
      bDate = DateTime.tryParse(json['bookingDate'].toString()) ?? DateTime.now();
    }

    final sTime = json['startTime']?.toString() ?? '08:00';
    var eTime = json['endTime']?.toString() ?? '09:00';
    if (eTime.startsWith('1.') || eTime.startsWith('24')) {
      eTime = '24:00:00';
    }
    final hoursNeeded = json['hoursNeeded'] != null ? (json['hoursNeeded'] as num).toInt() : 1;
    final totalAmount = json['totalAmount'] != null ? (json['totalAmount'] as num).toDouble() : 0.0;

    // Equipments
    List<EquipmentPaymentItem> eqList = [];
    final rawEq = json['equipmentPayments'] ?? json['EquipmentPayments'];
    if (rawEq is List) {
      eqList = rawEq.map((e) => EquipmentPaymentItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    }

    // Review
    BookingReviewItem? rev = attachedReview;
    if (rev == null && json['review'] is Map) {
      rev = BookingReviewItem.fromJson(Map<String, dynamic>.from(json['review'] as Map));
    }

    return Booking(
      id: id,
      userId: userId,
      facilityId: facilityId,
      facilityName: facName,
      customerName: json['customerName']?.toString() ?? 'Member',
      contactNumber: json['contactNumber']?.toString() ?? '',
      nicNumber: json['nicNumber']?.toString() ?? '',
      bookingDate: bDate,
      startTime: sTime,
      endTime: eTime,
      hoursNeeded: hoursNeeded,
      totalAmount: totalAmount,
      status: json['status']?.toString() ?? 'Pending',
      paymentMethod: json['paymentMethod']?.toString() ?? 'Card',
      paymentStatus: json['paymentStatus']?.toString() ?? 'Pending',
      bankSlipFileName: json['bankSlipFileName']?.toString(),
      cancellationReason: json['cancellationReason']?.toString(),
      refundAmount: json['refundAmount'] != null ? (json['refundAmount'] as num).toDouble() : null,
      refundPercentage: json['refundPercentage'] != null ? (json['refundPercentage'] as num).toInt() : null,
      refundStatus: json['refundStatus']?.toString(),
      cancelledAt: json['cancelledAt'] != null ? DateTime.tryParse(json['cancelledAt'].toString()) : null,
      refundConfirmedAt: json['refundConfirmedAt'] != null ? DateTime.tryParse(json['refundConfirmedAt'].toString()) : null,
      refundConfirmedBy: json['refundConfirmedBy']?.toString(),
      refundNotes: json['refundNotes']?.toString(),
      isRescheduleRequested: json['isRescheduleRequested'] == true || json['status'] == 'RescheduleRequested',
      rescheduleReason: json['rescheduleReason']?.toString(),
      rescheduleRequestedAt: json['rescheduleRequestedAt'] != null ? DateTime.tryParse(json['rescheduleRequestedAt'].toString()) : null,
      equipmentPayments: eqList,
      review: rev,
    );
  }

  Booking copyWith({
    BookingReviewItem? review,
    String? status,
    String? paymentStatus,
  }) {
    return Booking(
      id: id,
      userId: userId,
      facilityId: facilityId,
      facilityName: facilityName,
      customerName: customerName,
      contactNumber: contactNumber,
      nicNumber: nicNumber,
      bookingDate: bookingDate,
      startTime: startTime,
      endTime: endTime,
      hoursNeeded: hoursNeeded,
      totalAmount: totalAmount,
      status: status ?? this.status,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      bankSlipFileName: bankSlipFileName,
      cancellationReason: cancellationReason,
      refundAmount: refundAmount,
      refundPercentage: refundPercentage,
      refundStatus: refundStatus,
      cancelledAt: cancelledAt,
      refundConfirmedAt: refundConfirmedAt,
      refundConfirmedBy: refundConfirmedBy,
      refundNotes: refundNotes,
      isRescheduleRequested: isRescheduleRequested,
      rescheduleReason: rescheduleReason,
      rescheduleRequestedAt: rescheduleRequestedAt,
      equipmentPayments: equipmentPayments,
      review: review ?? this.review,
    );
  }
}
