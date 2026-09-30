import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../models/booking.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/facility_images.dart';

class ReviewModal extends StatefulWidget {
  final Booking booking;
  final BookingReviewItem? existingReview;
  final VoidCallback onSaved;

  const ReviewModal({super.key, required this.booking, this.existingReview, required this.onSaved});

  static Future<void> show(BuildContext context, Booking booking, {BookingReviewItem? existingReview, required VoidCallback onSaved}) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => ReviewModal(booking: booking, existingReview: existingReview, onSaved: onSaved),
    );
  }

  @override
  State<ReviewModal> createState() => _ReviewModalState();
}

class _ReviewModalState extends State<ReviewModal> {
  final ApiService _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();

  late TextEditingController _nameController;
  late TextEditingController _reviewController;
  int _rating = 5;
  List<XFile> _selectedPhotos = [];
  List<String> _existingPhotoPaths = [];
  bool _isSubmitting = false;
  String? _error;

  static const Map<int, String> _ratingDescriptions = {
    1: '😞 Poor — Significant court or service issues',
    2: '😐 Fair — Met bare minimum expectations',
    3: '🙂 Good — Enjoyable game and reliable court',
    4: '😊 Very Good — High quality surface, lighting & amenities',
    5: '🤩 Outstanding — Professional tournament-grade experience!',
  };

  @override
  void initState() {
    super.initState();
    final rev = widget.existingReview ?? widget.booking.review;
    _nameController = TextEditingController(
      text: rev?.name.isNotEmpty == true ? rev!.name : (_apiService.currentUser?.fullName ?? 'Member'),
    );
    _reviewController = TextEditingController(text: rev?.review ?? '');
    _rating = rev?.rating != null && rev!.rating >= 1 && rev.rating <= 5 ? rev.rating : 5;
    _existingPhotoPaths = rev?.photoPaths != null ? List.from(rev!.photoPaths) : [];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _reviewController.dispose();
    super.dispose();
  }

  int get _totalPhotosCount => _existingPhotoPaths.length + _selectedPhotos.length;

  Future<void> _pickPhotosSource() async {
    if (_totalPhotosCount >= 4) {
      setState(() => _error = 'Maximum of 4 photos allowed per review.');
      return;
    }

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Add Match Photos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.deepHeading)),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppTheme.primary),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickFromGallery();
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: AppTheme.primary),
                title: const Text('Take a Photo with Camera'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickFromCamera();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickFromGallery() async {
    try {
      final remaining = 4 - _totalPhotosCount;
      if (remaining <= 0) return;
      final images = await _picker.pickMultiImage();
      if (images.isNotEmpty) {
        setState(() {
          _selectedPhotos = [..._selectedPhotos, ...images.take(remaining)];
          _error = null;
        });
      }
    } catch (_) {}
  }

  Future<void> _pickFromCamera() async {
    try {
      if (_totalPhotosCount >= 4) return;
      final photo = await _picker.pickImage(source: ImageSource.camera);
      if (photo != null) {
        setState(() {
          _selectedPhotos.add(photo);
          _error = null;
        });
      }
    } catch (_) {}
  }

  Future<void> _handleSubmit() async {
    final name = _nameController.text.trim();
    final reviewText = _reviewController.text.trim();

    if (name.isEmpty) {
      setState(() => _error = 'Please enter your display name.');
      return;
    }
    if (reviewText.isEmpty) {
      setState(() => _error = 'Please share your experience in the review details.');
      return;
    }
    if (_rating < 1 || _rating > 5) {
      setState(() => _error = 'Please select a star rating (1 to 5 stars).');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final rev = widget.existingReview ?? widget.booking.review;
      if (rev != null && rev.id > 0) {
        await _apiService.updateReview(
          reviewId: rev.id,
          bookingId: widget.booking.id,
          name: name,
          rating: _rating,
          review: reviewText,
          photos: _selectedPhotos,
        );
      } else {
        await _apiService.createReview(
          bookingId: widget.booking.id,
          name: name,
          rating: _rating,
          review: reviewText,
          photos: _selectedPhotos,
        );
      }

      if (mounted) {
        Navigator.pop(context);
        widget.onSaved();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.successDark,
            content: Text(rev != null ? 'Review updated successfully!' : 'Thank you! Your verified player review is live.'),
          ),
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
    final isEditing = (widget.existingReview ?? widget.booking.review) != null;
    final dateFmt = DateFormat('EEE, MMM d, yyyy');

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEditing ? 'Update Review' : 'Rate Your Experience',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.deepHeading),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Verified Member Review',
                          style: TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w700),
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
              const SizedBox(height: 14),

              // Booking Session Context Card
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.scaffoldBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.sports_rounded, color: AppTheme.primary, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.booking.facilityName.isNotEmpty ? widget.booking.facilityName : 'Sports Arena',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading),
                          ),
                          Text(
                            '${dateFmt.format(widget.booking.bookingDate)} • ${widget.booking.startTime.length >= 5 ? widget.booking.startTime.substring(0, 5) : widget.booking.startTime} - ${widget.booking.endTime.length >= 5 ? widget.booking.endTime.substring(0, 5) : widget.booking.endTime}',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // 5-Star Rating Picker
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (index) {
                    final starNum = index + 1;
                    return IconButton(
                      onPressed: () => setState(() => _rating = starNum),
                      icon: Icon(
                        starNum <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                        size: 38,
                        color: const Color(0xFFF59E0B),
                      ),
                    );
                  }),
                ),
              ),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _ratingDescriptions[_rating] ?? '$_rating of 5 Stars',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFFB45309)),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Display Name
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Your Display Name *',
                  prefixIcon: Icon(Icons.person_outline, size: 20),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),

              // Review Details Field
              TextField(
                controller: _reviewController,
                maxLines: 4,
                maxLength: 1000,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Share details of your session *',
                  hintText: 'Turf grip, court lighting, cleanliness, gear tension, staff assistance...',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 10),

              // Photo Picker Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Text('Session Photos:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.deepHeading)),
                      const SizedBox(width: 6),
                      Text('($_totalPhotosCount/4)', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    ],
                  ),
                  if (_totalPhotosCount < 4)
                    TextButton.icon(
                      onPressed: _pickPhotosSource,
                      icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                      label: const Text('Add Photos', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                ],
              ),

              // Photos preview grid
              if (_existingPhotoPaths.isNotEmpty || _selectedPhotos.isNotEmpty) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 72,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      // Existing photos (if editing)
                      ..._existingPhotoPaths.map((path) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: buildUniversalImage(
                                  path,
                                  width: 72,
                                  height: 72,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                top: 3,
                                right: 3,
                                child: GestureDetector(
                                  onTap: () => setState(() => _existingPhotoPaths.remove(path)),
                                  child: Container(
                                    padding: const EdgeInsets.all(2),
                                    decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                    child: const Icon(Icons.close, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                      // Newly selected photos
                      ..._selectedPhotos.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final photo = entry.value;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Image.file(
                                  File(photo.path),
                                  width: 72,
                                  height: 72,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                top: 3,
                                right: 3,
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedPhotos.removeAt(idx)),
                                  child: Container(
                                    padding: const EdgeInsets.all(2),
                                    decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                    child: const Icon(Icons.close, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],

              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],

              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                child: _isSubmitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(
                        isEditing ? 'Update Review' : 'Submit Review',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
