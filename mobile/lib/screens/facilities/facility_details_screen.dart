import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/facility.dart';
import '../../models/booking.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/facility_images.dart';
import '../../widgets/edit_facility_modal.dart';

class FacilityDetailsScreen extends StatefulWidget {
  final Facility facility;
  final VoidCallback onBookNow;
  final VoidCallback? onBack;

  const FacilityDetailsScreen({
    super.key,
    required this.facility,
    required this.onBookNow,
    this.onBack,
  });

  @override
  State<FacilityDetailsScreen> createState() => _FacilityDetailsScreenState();
}

class _FacilityDetailsScreenState extends State<FacilityDetailsScreen> {
  final ApiService _apiService = ApiService();
  List<BookingReviewItem> _reviews = [];
  bool _isLoadingReviews = true;
  int _activeImageIndex = 0;
  late final PageController _imagePageController;

  @override
  void initState() {
    super.initState();
    _imagePageController = PageController();
    _loadReviews();
  }

  @override
  void dispose() {
    _imagePageController.dispose();
    super.dispose();
  }

  Future<void> _loadReviews() async {
    try {
      final allReviews = await _apiService.getReviews();
      if (mounted) {
        setState(() {
          _reviews = allReviews.where((r) {
            final fName = widget.facility.name.toLowerCase();
            final rName = (r.facilityName ?? '').toLowerCase();
            return rName.contains(fName) || fName.contains(rName);
          }).toList();
          _isLoadingReviews = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingReviews = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final f = widget.facility;
    final images = getFacilityImages(f);
    final currencyFmt = NumberFormat('#,##0', 'en_US');

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: CustomScrollView(
        slivers: [
          // Collapsible Image Header
          SliverAppBar(
            expandedHeight: 260.0,
            pinned: true,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                child: const Icon(Icons.arrow_back, color: AppTheme.deepHeading, size: 20),
              ),
              onPressed: widget.onBack ?? () => Navigator.pop(context),
            ),
            actions: [
              if (ApiService().currentUser?.isAdmin == true)
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: const Icon(Icons.edit_outlined, color: AppTheme.primary, size: 20),
                    ),
                    tooltip: 'Edit Facility',
                    onPressed: () => EditFacilityModal.show(context, widget.facility, () {
                      if (widget.onBack != null) {
                        widget.onBack!();
                      } else {
                        Navigator.pop(context);
                      }
                    }),
                  ),
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _imagePageController,
                    itemCount: images.length,
                    physics: const PageScrollPhysics(),
                    onPageChanged: (idx) => setState(() => _activeImageIndex = idx),
                    itemBuilder: (context, idx) {
                      final imgUrl = images[idx];
                      return buildUniversalImage(
                        imgUrl,
                        fit: BoxFit.cover,
                        errorWidget: (context) => _fallbackCover(f),
                      );
                    },
                  ),

                  // Gradient overlay with IgnorePointer so touch gestures pass directly to PageView
                  const Positioned.fill(
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.black54, Colors.transparent, Colors.black87],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Carousel dot indicators
                  if (images.length > 1)
                    Positioned(
                      bottom: 16,
                      left: 0,
                      right: 0,
                      child: IgnorePointer(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(images.length, (idx) {
                            final isCurrent = _activeImageIndex == idx;
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              width: isCurrent ? 20 : 6,
                              height: 6,
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              decoration: BoxDecoration(
                                color: isCurrent ? Colors.white : Colors.white54,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 4),
                                ],
                              ),
                            );
                          }),
                        ),
                      ),
                    ),

                  // Tap navigation: Left chevron button
                  if (images.length > 1 && _activeImageIndex > 0)
                    Positioned(
                      left: 12,
                      top: 120,
                      child: GestureDetector(
                        onTap: () {
                          _imagePageController.previousPage(
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeInOut,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.45),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.chevron_left_rounded, color: Colors.white, size: 24),
                        ),
                      ),
                    ),

                  // Tap navigation: Right chevron button
                  if (images.length > 1 && _activeImageIndex < images.length - 1)
                    Positioned(
                      right: 12,
                      top: 120,
                      child: GestureDetector(
                        onTap: () {
                          _imagePageController.nextPage(
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeInOut,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.45),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 24),
                        ),
                      ),
                    ),

                  // Photo index badge (e.g. 1 / 4)
                  if (images.length > 1)
                    Positioned(
                      bottom: 14,
                      right: 14,
                      child: IgnorePointer(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${_activeImageIndex + 1} / ${images.length}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Content body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badges Row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          f.type.toUpperCase(),
                          style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 11),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: f.isOutdoor ? const Color(0xFFFEF3C7) : const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          f.courtType,
                          style: TextStyle(
                            color: f.isOutdoor ? const Color(0xFFB45309) : AppTheme.purple,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: f.isAvailable ? AppTheme.successBg : AppTheme.dangerBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          f.status,
                          style: TextStyle(
                            color: f.isAvailable ? AppTheme.successDark : AppTheme.dangerDark,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Facility Title & Rating
                  Text(
                    f.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.deepHeading,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),

                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 20),
                      const SizedBox(width: 4),
                      Text(
                        f.rating != null ? f.rating!.toStringAsFixed(1) : '5.0',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.deepHeading),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '(${f.ratingCount > 0 ? f.ratingCount : (_reviews.isNotEmpty ? _reviews.length : 12)} reviews)',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                      ),
                      const SizedBox(width: 12),
                      const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.textMuted),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          f.location,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Key Details Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _detailItem('Rate', 'LKR ${currencyFmt.format(f.hourlyRate)}', 'per hour', Icons.payments_outlined),
                        Container(width: 1, height: 40, color: AppTheme.border),
                        _detailItem('Hours', '${f.openingTime} - ${f.closingTime}', 'Daily open', Icons.access_time_rounded),
                        Container(width: 1, height: 40, color: AppTheme.border),
                        _detailItem('Type', f.courtType, f.type, Icons.sports_tennis_rounded),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Description
                  if (f.description.isNotEmpty) ...[
                    const Text('About Venue', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                    const SizedBox(height: 8),
                    Text(
                      f.description,
                      style: const TextStyle(color: AppTheme.textBody, fontSize: 14, height: 1.5),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Available Equipment Rental Catalog
                  if (f.equipments.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Available Gear Rental', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                        Text('${f.equipments.length} items', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ...f.equipments.map((eq) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(10)),
                              child: const Icon(Icons.sports_rounded, color: AppTheme.primary, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                eq.name,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.deepHeading),
                              ),
                            ),
                            Text(
                              eq.hourlyRate != null && eq.hourlyRate! > 0
                                  ? '+ LKR ${currencyFmt.format(eq.hourlyRate)}/h'
                                  : 'Free with court',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: eq.hourlyRate != null && eq.hourlyRate! > 0 ? AppTheme.primary : AppTheme.successDark,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 20),
                  ],

                  // Reviews & Ratings Section
                  Row(
                    children: [
                      const Text('Player Reviews', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: AppTheme.primaryBg, borderRadius: BorderRadius.circular(6)),
                        child: Text('${_reviews.length}', style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 11)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_isLoadingReviews)
                    const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
                  else if (_reviews.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                      child: const Text('No reviews yet for this venue. Be the first to leave one after your session!', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                    )
                  else
                    ..._reviews.map((r) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 14,
                                      backgroundColor: AppTheme.primaryBg,
                                      child: Text(
                                        r.name.isNotEmpty ? r.name[0].toUpperCase() : 'M',
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppTheme.primary),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(r.name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                                  ],
                                ),
                                Row(
                                  children: List.generate(5, (sIdx) {
                                    return Icon(
                                      sIdx < r.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                                      size: 15,
                                      color: const Color(0xFFF59E0B),
                                    );
                                  }),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(r.review, style: const TextStyle(color: AppTheme.textBody, fontSize: 13, height: 1.35)),
                            // Review Attached Photos
                            if (r.photoPaths.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              SizedBox(
                                height: 68,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: r.photoPaths.length,
                                  separatorBuilder: (context, index) => const SizedBox(width: 8),
                                  itemBuilder: (context, pIdx) {
                                    final photoUrl = r.photoPaths[pIdx];
                                    return GestureDetector(
                                      onTap: () => _showPhotoPreview(context, photoUrl),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(10),
                                        child: Container(
                                          decoration: BoxDecoration(
                                            border: Border.all(color: AppTheme.border),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: buildUniversalImage(
                                            photoUrl,
                                            width: 68,
                                            height: 68,
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: 20),

                  // FAQ Accordion
                  if (f.faq.isNotEmpty) ...[
                    const Text('Frequently Asked Questions', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.deepHeading)),
                    const SizedBox(height: 10),
                    ...f.faq.map((item) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: ExpansionTile(
                          shape: const Border(),
                          title: Text(item.question, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.deepHeading)),
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              child: Text(item.answer, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4)),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 80), // Padding for bottom floating bar
                  ],
                ],
              ),
            ),
          ),
        ],
      ),

      // Floating Bottom Booking Bar
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Rental Rate', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  Text(
                    'LKR ${currencyFmt.format(f.hourlyRate)}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.deepHeading),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: widget.onBookNow,
                  icon: const Icon(Icons.calendar_today_rounded, size: 18),
                  label: const Text('Book Court Now', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailItem(String label, String value, String sub, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primary, size: 20),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.deepHeading)),
        Text(sub, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
      ],
    );
  }

  Widget _fallbackCover(Facility f) {
    return FacilityImageWidget(
      facility: f,
      width: double.infinity,
      height: double.infinity,
      fit: BoxFit.cover,
    );
  }

  void _showPhotoPreview(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: InteractiveViewer(
                child: buildUniversalImage(
                  imageUrl,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: GestureDetector(
                onTap: () => Navigator.pop(ctx),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
