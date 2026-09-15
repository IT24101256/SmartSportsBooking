import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

class UserProfile {
  final int id;
  final String fullName;
  final String email;
  final String role;

  UserProfile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['userId'] is int
          ? json['userId']
          : int.tryParse(json['userId']?.toString() ?? '0') ?? 0,
      fullName: json['fullName'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'Customer',
    );
  }
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Default to localhost:5187
  // On physical Android with `adb reverse tcp:5187 tcp:5187`, localhost works.
  // On Android Emulator, 10.0.2.2 is typically used.
  String _baseUrl = 'http://localhost:5187';

  String get baseUrl => _baseUrl;
  set baseUrl(String url) {
    _baseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
  }

  String? _token;
  UserProfile? _currentUser;

  bool get isAuthenticated => _token != null;
  UserProfile? get currentUser => _currentUser;
  String? get token => _token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  void initialize() {
    if (!kIsWeb) {
      HttpOverrides.global = DevHttpOverrides();
    }
  }

  Future<UserProfile> login(String email, String password) async {
    final uri = Uri.parse('$_baseUrl/api/auth/login');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _token = data['token'] as String?;
        _currentUser = UserProfile.fromJson(data);
        return _currentUser!;
      } else {
        final err = _extractErrorMessage(response);
        throw Exception(err.isNotEmpty ? err : 'Login failed (${response.statusCode})');
      }
    } on SocketException catch (_) {
      throw Exception('Cannot reach backend at $_baseUrl. Check your network or run adb reverse.');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception(e.toString());
    }
  }

  Future<void> register(String fullName, String email, String password) async {
    final uri = Uri.parse('$_baseUrl/api/auth/register');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'fullName': fullName.trim(),
              'email': email.trim(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return;
      } else {
        final err = _extractErrorMessage(response);
        throw Exception(err.isNotEmpty ? err : 'Registration failed (${response.statusCode})');
      }
    } on SocketException catch (_) {
      throw Exception('Cannot reach backend at $_baseUrl.');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception(e.toString());
    }
  }

  void logout() {
    _token = null;
    _currentUser = null;
  }

  Future<List<Map<String, dynamic>>> getFacilities() async {
    final uri = Uri.parse('$_baseUrl/api/Facilities');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((item) => item as Map<String, dynamic>).toList();
      }
      throw Exception('Failed to load facilities (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getSchedule() async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/schedule');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((item) => item as Map<String, dynamic>).toList();
      }
      throw Exception('Failed to load schedule (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getSupportRequests() async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/support-requests');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((item) => item as Map<String, dynamic>).toList();
      }
      throw Exception('Failed to load support requests (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createSupportRequest({
    required String title,
    required String detail,
    required String priority,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/support-requests');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'title': title.trim(),
              'detail': detail.trim(),
              'priority': priority,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Failed to submit support request (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getBookings() async {
    final uri = Uri.parse('$_baseUrl/api/bookings');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((item) => item as Map<String, dynamic>).toList();
      }
      throw Exception('Failed to load bookings (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createBooking({
    required int facilityId,
    required DateTime bookingDate,
    required String startTime,
    required String endTime,
    String notes = '',
  }) async {
    final uri = Uri.parse('$_baseUrl/api/bookings');
    try {
      final utcDate = DateTime.utc(
        bookingDate.year,
        bookingDate.month,
        bookingDate.day,
      );

      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'facilityId': facilityId,
              'bookingDate': utcDate.toIso8601String(),
              'startTime': startTime,
              'endTime': endTime,
              'notes': notes,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final err = _extractErrorMessage(response);
        throw Exception(err.isNotEmpty ? err : 'Booking failed (${response.statusCode})');
      }
    } catch (e) {
      rethrow;
    }
  }

  String _extractErrorMessage(http.Response response) {
    try {
      final body = response.body;
      if (body.startsWith('{') && body.endsWith('}')) {
        final parsed = jsonDecode(body) as Map<String, dynamic>;
        if (parsed.containsKey('title')) return parsed['title'].toString();
        if (parsed.containsKey('error')) return parsed['error'].toString();
        if (parsed.containsKey('message')) return parsed['message'].toString();
      }
      return body.trim();
    } catch (_) {
      return '';
    }
  }
}
