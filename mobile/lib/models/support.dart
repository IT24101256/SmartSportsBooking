class SupportMessage {
  final int id;
  final String message;
  final DateTime createdAt;
  final String senderName;

  SupportMessage({
    required this.id,
    required this.message,
    required this.createdAt,
    required this.senderName,
  });

  factory SupportMessage.fromJson(Map<String, dynamic> json) {
    return SupportMessage(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      message: json['message']?.toString() ?? '',
      createdAt: json['createdAtUtc'] != null
          ? DateTime.tryParse(json['createdAtUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
      senderName: json['senderName']?.toString() ?? 'Member',
    );
  }
}

class SupportRequest {
  final int id;
  final int userId;
  final String title;
  final String detail;
  final String priority;
  final String status;
  final DateTime createdAt;

  SupportRequest({
    required this.id,
    required this.userId,
    required this.title,
    required this.detail,
    required this.priority,
    required this.status,
    required this.createdAt,
  });

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isUnderReview => status.toLowerCase() == 'underreview';
  bool get isResolved => status.toLowerCase() == 'resolved';

  factory SupportRequest.fromJson(Map<String, dynamic> json) {
    return SupportRequest(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      userId: json['userId'] is int ? json['userId'] : int.tryParse(json['userId']?.toString() ?? '0') ?? 0,
      title: json['title']?.toString() ?? 'Support Request',
      detail: json['detail']?.toString() ?? '',
      priority: json['priority']?.toString() ?? 'Medium',
      status: json['status']?.toString() ?? 'Pending',
      createdAt: json['createdAtUtc'] != null
          ? DateTime.tryParse(json['createdAtUtc'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
