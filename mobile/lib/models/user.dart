class UserProfile {
  final int id;
  final String fullName;
  final String email;
  final String contactNumber;
  final String nicNumber;
  final String role;
  final String? profilePicture;

  UserProfile({
    required this.id,
    required this.fullName,
    required this.email,
    this.contactNumber = '',
    this.nicNumber = '',
    required this.role,
    this.profilePicture,
  });

  bool get isAdmin => role.toLowerCase() == 'admin';
  bool get isManager => role.toLowerCase() == 'manager';
  bool get isStaff => role.toLowerCase() == 'staff';
  bool get isStaffOrAdmin => isAdmin || isManager || isStaff;
  bool get isManagerOrAdmin => isAdmin || isManager;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['userId'] is int
          ? json['userId']
          : (json['id'] is int
              ? json['id']
              : int.tryParse(json['userId']?.toString() ?? json['id']?.toString() ?? '0') ?? 0),
      fullName: json['fullName'] ?? json['name'] ?? '',
      email: json['email'] ?? '',
      contactNumber: json['contactNumber'] ?? '',
      nicNumber: json['nicNumber'] ?? '',
      role: json['role'] ?? 'Customer',
      profilePicture: json['profilePicture'] as String?,
    );
  }

  UserProfile copyWith({
    String? fullName,
    String? contactNumber,
    String? nicNumber,
    String? profilePicture,
  }) {
    return UserProfile(
      id: id,
      fullName: fullName ?? this.fullName,
      email: email,
      contactNumber: contactNumber ?? this.contactNumber,
      nicNumber: nicNumber ?? this.nicNumber,
      role: role,
      profilePicture: profilePicture ?? this.profilePicture,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'fullName': fullName,
        'email': email,
        'contactNumber': contactNumber,
        'nicNumber': nicNumber,
        'role': role,
        'profilePicture': profilePicture,
      };
}
