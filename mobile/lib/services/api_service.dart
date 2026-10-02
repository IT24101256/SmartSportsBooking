import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import '../models/user.dart';
import '../models/facility.dart';
import '../models/booking.dart';
import '../models/support.dart';
import '../models/equipment.dart';
import '../models/revenue.dart';

class DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5187',
  );

  File get _storageFile {
    final tempDir = Directory.systemTemp.path;
    return File('$tempDir/smartsports_base_url.txt');
  }

  Future<void> _loadPersistedUrl() async {
    try {
      final file = _storageFile;
      if (await file.exists()) {
        final content = (await file.readAsString()).trim();
        if (content.isNotEmpty && Uri.tryParse(content)?.hasScheme == true) {
          _baseUrl = content.replaceAll(RegExp(r'/+$'), '');
        }
      }
    } catch (_) {}
  }

  Future<void> _savePersistedUrl(String url) async {
    try {
      final file = _storageFile;
      await file.writeAsString(url.trim());
    } catch (_) {}
  }

  String get baseUrl => _baseUrl;
  set baseUrl(String url) {
    _baseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    _savePersistedUrl(_baseUrl);
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

  Map<String, String> get _authHeaderOnly => {
        'Accept': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<bool> testConnection([String? url]) async {
    final target = (url ?? _baseUrl).trim().replaceAll(RegExp(r'/+$'), '');
    try {
      final res = await http.get(
        Uri.parse('$target/api/Facilities?pageSize=1'),
      ).timeout(const Duration(milliseconds: 1600));
      return res.statusCode >= 200 && res.statusCode < 400;
    } catch (_) {
      return false;
    }
  }

  Future<String?> autoDetectBackendUrl() async {
    if (await testConnection(_baseUrl)) {
      debugPrint('[ApiService] Connected to backend at $_baseUrl');
      return _baseUrl;
    }

    final candidates = [
      'http://localhost:5187',
      'http://10.0.2.2:5187',
      'http://192.168.8.140:5187',
    ];

    for (final candidate in candidates) {
      if (candidate == _baseUrl) continue;
      if (await testConnection(candidate)) {
        debugPrint('[ApiService] Auto-detected reachable backend at $candidate');
        _baseUrl = candidate;
        await _savePersistedUrl(candidate);
        return candidate;
      }
    }

    debugPrint('[ApiService] Backend auto-detection did not find an active server.');
    return null;
  }

  Future<void> initialize() async {
    if (!kIsWeb && kDebugMode) {
      HttpOverrides.global = DevHttpOverrides();
    }
    await _loadPersistedUrl();
    if (!kIsWeb && kDebugMode) {
      await autoDetectBackendUrl();
    }
  }

  void logout() {
    _token = null;
    _currentUser = null;
  }

  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------

  Future<UserProfile> login(String email, String password) async {
    final uri = Uri.parse('$_baseUrl/api/auth/login');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _token = data['token'] as String?;
        _currentUser = UserProfile.fromJson(data);
        return _currentUser!;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } on SocketException catch (_) {
      throw Exception('Cannot connect to backend at $_baseUrl. Check your network or URL configuration.');
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String contactNumber,
    required String nicNumber,
    required String password,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/auth/register');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({
              'fullName': fullName.trim(),
              'email': email.trim(),
              'contactNumber': contactNumber.trim(),
              'nicNumber': nicNumber.trim(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    final uri = Uri.parse('$_baseUrl/api/auth/verify-otp');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({
              'email': email.trim().toLowerCase(),
              'otp': otp.trim(),
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final uri = Uri.parse('$_baseUrl/api/auth/forgot-password');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email.trim().toLowerCase()}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> resetPassword({required String email, required String otp, required String newPassword}) async {
    final uri = Uri.parse('$_baseUrl/api/auth/reset-password');
    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email.trim().toLowerCase(),
              'otp': otp.trim(),
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode != 200) {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> changePassword({required String currentPassword, required String newPassword}) async {
    final uri = Uri.parse('$_baseUrl/api/auth/change-password');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'currentPassword': currentPassword,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode != 200) {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  // ----------------------------------------------------
  // FACILITIES
  // ----------------------------------------------------

  Future<List<Facility>> getFacilities() async {
    final uri = Uri.parse('$_baseUrl/api/Facilities?pageSize=100');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final payload = jsonDecode(response.body);
        final list = payload is Map<String, dynamic> ? payload['items'] as List<dynamic> : payload as List<dynamic>;
        return list.map((item) => Facility.fromJson(item as Map<String, dynamic>)).toList();
      }
      throw Exception('Failed to load facilities (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<Facility> getFacility(int id) async {
    final uri = Uri.parse('$_baseUrl/api/Facilities/$id');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        return Facility.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception('Facility not found (${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  Future<void> saveFacility(Map<String, dynamic> data, {int? id}) async {
    final uri = Uri.parse(id != null ? '$_baseUrl/api/Facilities/$id' : '$_baseUrl/api/Facilities');
    try {
      final payload = Map<String, dynamic>.from(data);
      if (payload['images'] is List) {
        payload['images'] = jsonEncode(payload['images']);
      }
      if (payload['faq'] is List) {
        payload['faq'] = jsonEncode(payload['faq']);
      }

      final response = id != null
          ? await http.put(uri, headers: _headers, body: jsonEncode(payload)).timeout(const Duration(seconds: 15))
          : await http.post(uri, headers: _headers, body: jsonEncode(payload)).timeout(const Duration(seconds: 15));

      if (response.statusCode != 200 && response.statusCode != 201 && response.statusCode != 204) {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteFacility(int id) async {
    final uri = Uri.parse('$_baseUrl/api/Facilities/$id');
    try {
      final response = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  // ----------------------------------------------------
  // BOOKINGS & AVAILABILITY
  // ----------------------------------------------------

  Future<Map<String, dynamic>> getAvailability(int facilityId, DateTime date) async {
    final dateStr = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final now = DateTime.now();
    final clientTime = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:00';
    final uri = Uri.parse('$_baseUrl/api/bookings/availability?facilityId=$facilityId&date=$dateStr&clientTime=$clientTime');

    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Booking>> getBookings({
    String? search,
    String? status,
    String? date,
    String? turf,
    int? facilityId,
  }) async {
    final queryParams = <String, String>{
      'pageSize': '200',
      if (search != null && search.isNotEmpty) 'search': search,
      if (status != null && status.isNotEmpty) 'status': status,
      if (date != null && date.isNotEmpty) 'date': date,
      if (turf != null && turf.isNotEmpty) 'turf': turf,
      if (facilityId != null && facilityId > 0) 'facilityId': facilityId.toString(),
    };

    final uri = Uri.parse('$_baseUrl/api/bookings').replace(queryParameters: queryParams);
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final payload = jsonDecode(response.body);
        final list = payload is Map<String, dynamic> ? payload['items'] as List<dynamic> : payload as List<dynamic>;
        return list.map((item) => Booking.fromJson(item as Map<String, dynamic>)).toList();
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
    required int hoursNeeded,
    required String paymentMethod,
    String customerName = '',
    String contactNumber = '',
    String nicNumber = '',
    String? cardNumber,
    int? expiryMonth,
    int? expiryYear,
    String? cvv,
    XFile? bankSlip,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/bookings');

    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(_authHeaderOnly);

    final dateIso = '${bookingDate.year.toString().padLeft(4, '0')}-${bookingDate.month.toString().padLeft(2, '0')}-${bookingDate.day.toString().padLeft(2, '0')}T00:00:00.000Z';
    final sTime = startTime.length == 5 ? '$startTime:00' : startTime;
    final startHour = int.tryParse(sTime.substring(0, 2)) ?? 8;
    final endHour = startHour + hoursNeeded;
    final eTime = '${endHour.toString().padLeft(2, '0')}:00:00';

    request.fields['facilityId'] = facilityId.toString();
    request.fields['bookingDate'] = dateIso;
    request.fields['startTime'] = sTime;
    request.fields['endTime'] = eTime;
    request.fields['hoursNeeded'] = hoursNeeded.toString();
    request.fields['paymentMethod'] = paymentMethod;

    if (customerName.isNotEmpty) request.fields['customerName'] = customerName;
    if (contactNumber.isNotEmpty) request.fields['contactNumber'] = contactNumber;
    if (nicNumber.isNotEmpty) request.fields['nicNumber'] = nicNumber;

    if (paymentMethod == 'Card') {
      if (cardNumber != null) request.fields['cardNumber'] = cardNumber.replaceAll(' ', '');
      if (expiryMonth != null) request.fields['expiryMonth'] = expiryMonth.toString();
      if (expiryYear != null) request.fields['expiryYear'] = expiryYear.toString();
      if (cvv != null) request.fields['cvv'] = cvv;
    }

    if (paymentMethod == 'BankTransfer' && bankSlip != null) {
      final bytes = await bankSlip.readAsBytes();
      request.files.add(http.MultipartFile.fromBytes(
        'bankSlip',
        bytes,
        filename: bankSlip.name.isNotEmpty ? bankSlip.name : 'bank_slip.jpg',
      ));
    }

    try {
      final streamedResponse = await request.send().timeout(const Duration(seconds: 20));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<CancellationQuote> getCancellationQuote(int bookingId) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/cancellation-quote');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        return CancellationQuote.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Booking> cancelBookingWithRefund(int bookingId, {String reason = ''}) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/cancel');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({'reason': reason}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return Booking.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Booking> confirmRefund(int bookingId, {String notes = ''}) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/confirm-refund');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({'notes': notes}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return Booking.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Booking> requestReschedule(int bookingId, {String reason = ''}) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/request-reschedule');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({'reason': reason}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return Booking.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Booking> rescheduleBooking({
    required int bookingId,
    required DateTime newDate,
    required String newStartTime,
    required String newEndTime,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/reschedule');
    final dateIso = '${newDate.year.toString().padLeft(4, '0')}-${newDate.month.toString().padLeft(2, '0')}-${newDate.day.toString().padLeft(2, '0')}T00:00:00.000Z';

    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'bookingDate': dateIso,
              'startTime': newStartTime.length == 5 ? '$newStartTime:00' : newStartTime,
              'endTime': newEndTime.length == 5 ? '$newEndTime:00' : newEndTime,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return Booking.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Booking> updateBookingStatus(int bookingId, String status, {String? reason}) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/status');
    try {
      final response = await http
          .put(
            uri,
            headers: _headers,
            body: jsonEncode({'status': status, 'reason': reason}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return Booking.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Uint8List> getBankSlipBytes(int bookingId) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/bank-slip');
    final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 15));
    if (response.statusCode == 200) {
      return response.bodyBytes;
    }
    throw Exception(_extractErrorMessage(response));
  }

  Future<Map<String, dynamic>> addAdditionalEquipment({
    required int bookingId,
    required String equipmentName,
    required int quantity,
    required double hourlyRate,
    required int hours,
    required String paymentMethod,
    String? notes,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/bookings/$bookingId/additional-equipment');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'equipmentName': equipmentName,
              'quantity': quantity,
              'hourlyRate': hourlyRate,
              'hours': hours,
              'paymentMethod': paymentMethod,
              'notes': notes,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  // ----------------------------------------------------
  // REVIEWS
  // ----------------------------------------------------

  Future<List<BookingReviewItem>> getReviews() async {
    final uri = Uri.parse('$_baseUrl/api/reviews');
    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((e) => BookingReviewItem.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<BookingReviewItem> createReview({
    required int bookingId,
    required String name,
    required int rating,
    required String review,
    List<XFile>? photos,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/reviews');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(_authHeaderOnly);

    request.fields['BookingId'] = bookingId.toString();
    request.fields['Name'] = name.trim();
    request.fields['Rating'] = rating.toString();
    request.fields['Review'] = review.trim();

    if (photos != null) {
      for (final p in photos) {
        final bytes = await p.readAsBytes();
        final ext = p.name.split('.').last.toLowerCase();
        final subType = (ext == 'png' || ext == 'webp' || ext == 'gif') ? ext : 'jpeg';
        request.files.add(http.MultipartFile.fromBytes(
          'Photos',
          bytes,
          filename: p.name,
          contentType: MediaType('image', subType),
        ));
      }
    }

    try {
      final streamed = await request.send().timeout(const Duration(seconds: 20));
      final res = await http.Response.fromStream(streamed);
      if (res.statusCode == 200 || res.statusCode == 201) {
        return BookingReviewItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(res));
    } catch (e) {
      rethrow;
    }
  }

  Future<BookingReviewItem> updateReview({
    required int reviewId,
    required int bookingId,
    required String name,
    required int rating,
    required String review,
    List<XFile>? photos,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/reviews/$reviewId');
    final request = http.MultipartRequest('PUT', uri);
    request.headers.addAll(_authHeaderOnly);

    request.fields['BookingId'] = bookingId.toString();
    request.fields['Name'] = name.trim();
    request.fields['Rating'] = rating.toString();
    request.fields['Review'] = review.trim();

    if (photos != null && photos.isNotEmpty) {
      for (final p in photos) {
        final bytes = await p.readAsBytes();
        final ext = p.name.split('.').last.toLowerCase();
        final subType = (ext == 'png' || ext == 'webp' || ext == 'gif') ? ext : 'jpeg';
        request.files.add(http.MultipartFile.fromBytes(
          'Photos',
          bytes,
          filename: p.name,
          contentType: MediaType('image', subType),
        ));
      }
    }

    try {
      final streamed = await request.send().timeout(const Duration(seconds: 20));
      final res = await http.Response.fromStream(streamed);
      if (res.statusCode == 200) {
        return BookingReviewItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(res));
    } catch (e) {
      rethrow;
    }
  }

  String resolveImageUrl(String path) {
    if (path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image')) {
      return path;
    }
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$_baseUrl$cleanPath';
  }

  Future<void> deleteReview(int reviewId) async {
    final uri = Uri.parse('$_baseUrl/api/reviews/$reviewId');
    try {
      final res = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200 && res.statusCode != 204) {
        throw Exception(_extractErrorMessage(res));
      }
    } catch (e) {
      rethrow;
    }
  }

  // ----------------------------------------------------
  // DASHBOARD & ANALYTICS
  // ----------------------------------------------------

  Future<Map<String, dynamic>> getStats() async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/stats');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return {};
    } catch (_) {
      return {};
    }
  }

  Future<List<Map<String, dynamic>>> getSchedule() async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/schedule');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final payload = jsonDecode(response.body);
        final list = payload is Map<String, dynamic> ? payload['items'] as List<dynamic> : payload as List<dynamic>;
        return list.map((item) => Map<String, dynamic>.from(item as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<RevenueReport> getRevenue({DateTime? fromDate, DateTime? toDate}) async {
    final params = <String, String>{};
    if (fromDate != null) params['fromDate'] = fromDate.toIso8601String();
    if (toDate != null) params['toDate'] = toDate.toIso8601String();

    final uri = Uri.parse('$_baseUrl/api/dashboard/revenue').replace(queryParameters: params);
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        return RevenueReport.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  // ----------------------------------------------------
  // EQUIPMENTS
  // ----------------------------------------------------

  Future<List<Equipment>> getEquipments({String? sportCategory, int? facilityId, String? search}) async {
    final params = <String, String>{};
    if (sportCategory != null && sportCategory.isNotEmpty && sportCategory != 'All') {
      params['sportCategory'] = sportCategory;
    }
    if (facilityId != null && facilityId > 0) params['facilityId'] = facilityId.toString();
    if (search != null && search.isNotEmpty) params['search'] = search;

    final uri = Uri.parse('$_baseUrl/api/equipments').replace(queryParameters: params);
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((e) => Equipment.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Equipment> createEquipment({
    required String name,
    required String sportCategory,
    required double hourlyRate,
    int totalStock = 10,
    String? description,
    bool isAvailable = true,
    int? facilityId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/equipments');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'name': name.trim(),
              'sportCategory': sportCategory.trim(),
              'hourlyRate': hourlyRate,
              'totalStock': totalStock,
              'description': description?.trim(),
              'isAvailable': isAvailable,
              'facilityId': facilityId,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Equipment.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Equipment> updateEquipment(
    int id, {
    required String name,
    required String sportCategory,
    required double hourlyRate,
    int totalStock = 10,
    String? description,
    bool isAvailable = true,
    int? facilityId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/equipments/$id');
    try {
      final response = await http
          .put(
            uri,
            headers: _headers,
            body: jsonEncode({
              'name': name.trim(),
              'sportCategory': sportCategory.trim(),
              'hourlyRate': hourlyRate,
              'totalStock': totalStock,
              'description': description?.trim(),
              'isAvailable': isAvailable,
              'facilityId': facilityId,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return Equipment.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteEquipment(int id) async {
    final uri = Uri.parse('$_baseUrl/api/equipments/$id');
    try {
      final response = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception(_extractErrorMessage(response));
      }
    } catch (e) {
      rethrow;
    }
  }

  // ----------------------------------------------------
  // MEMBERS (Admin)
  // ----------------------------------------------------

  Future<List<Map<String, dynamic>>> getMembers() async {
    final uri = Uri.parse('$_baseUrl/api/members');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // ----------------------------------------------------
  // SUPPORT REQUESTS & MESSAGES
  // ----------------------------------------------------

  Future<List<SupportRequest>> getSupportRequests() async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/support-requests');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((item) => SupportRequest.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<SupportRequest> createSupportRequest({
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
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return SupportRequest.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<SupportRequest> updateSupportStatus(int id, String status) async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/support-requests/$id/status');
    try {
      final response = await http
          .put(
            uri,
            headers: _headers,
            body: jsonEncode({'status': status}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return SupportRequest.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<List<SupportMessage>> getSupportMessages(int supportId) async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/support-requests/$supportId/messages');
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((e) => SupportMessage.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<SupportMessage> addSupportMessage(int supportId, String message) async {
    final uri = Uri.parse('$_baseUrl/api/dashboard/support-requests/$supportId/messages');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({'message': message.trim()}),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return SupportMessage.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  String getReviewPhotoUrl(int reviewId, int photoIndex) {
    return '$_baseUrl/api/reviews/$reviewId/photos/$photoIndex';
  }

  String getBankSlipUrl(int bookingId) {
    return '$_baseUrl/api/bookings/$bookingId/bank-slip';
  }

  // ----------------------------------------------------
  // GROUNDED AGENTIC RAG & AI BOOKING SUB-SYSTEM
  // ----------------------------------------------------

  Future<Map<String, dynamic>> chatWithAi({
    required String message,
    String? conversationId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/ai/chat');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'message': message.trim(),
              'conversationId': ?conversationId,
            }),
          )
          .timeout(const Duration(seconds: 25));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> startAiBookingWorkflow({String? initialGoal}) async {
    final uri = Uri.parse('$_baseUrl/api/ai/booking/start');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'initialGoal': initialGoal ?? 'Book sports facility with AI',
            }),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> sendAiBookingMessage({
    required String workflowId,
    required String message,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/ai/booking/message');
    try {
      final response = await http
          .post(
            uri,
            headers: _headers,
            body: jsonEncode({
              'workflowId': workflowId,
              'message': message.trim(),
            }),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      throw Exception(_extractErrorMessage(response));
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> confirmAiBooking({
    required String workflowId,
    String paymentMethod = 'Card',
    String? cardNumber,
    String? cardLastFour = '4242',
    String? cvv,
    int? expiryMonth,
    int? expiryYear,
    XFile? bankSlip,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/ai/booking/confirm');
    try {
      if (paymentMethod == 'BankTransfer' && bankSlip != null) {
        final request = http.MultipartRequest('POST', uri);
        request.headers.addAll(_authHeaderOnly);
        request.fields['workflowId'] = workflowId;
        request.fields['paymentMethod'] = paymentMethod;

        final bytes = await bankSlip.readAsBytes();
        request.files.add(http.MultipartFile.fromBytes(
          'bankSlip',
          bytes,
          filename: bankSlip.name.isNotEmpty ? bankSlip.name : 'bank_slip.jpg',
        ));

        final streamedResponse = await request.send().timeout(const Duration(seconds: 20));
        final response = await http.Response.fromStream(streamedResponse);

        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
        throw Exception(_extractErrorMessage(response));
      } else {
        final payload = <String, dynamic>{
          'workflowId': workflowId,
          'paymentMethod': paymentMethod,
          'cardNumber': ?cardNumber,
          'cardLastFour': ?cardLastFour,
          'cvv': ?cvv,
          'expiryMonth': ?expiryMonth,
          'expiryYear': ?expiryYear,
        };

        final response = await http
            .post(
              uri,
              headers: _headers,
              body: jsonEncode(payload),
            )
            .timeout(const Duration(seconds: 20));

        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
        throw Exception(_extractErrorMessage(response));
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
      return body.trim().isNotEmpty ? body.trim() : 'Server responded with status ${response.statusCode}';
    } catch (_) {
      return 'Request failed with status ${response.statusCode}';
    }
  }
}
