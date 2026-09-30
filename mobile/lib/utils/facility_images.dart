import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/facility.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

List<String> getFacilityImages(Facility facility) {
  final list = <String>[];
  for (final img in facility.images) {
    if (img.trim().isNotEmpty) {
      list.add(img.trim());
    }
  }

  // If fewer than 2 images are available, add curated thematic gallery images
  if (list.length < 2) {
    final name = facility.name.toLowerCase();
    final type = facility.type.toLowerCase();

    if (name.contains('badminton') || type.contains('badminton')) {
      if (!list.contains('assets/images/facility-badminton.jpg')) list.add('assets/images/facility-badminton.jpg');
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
      if (!list.contains('assets/images/facility-tennis.jpg')) list.add('assets/images/facility-tennis.jpg');
    } else if (name.contains('cricket') || type.contains('cricket')) {
      if (!list.contains('assets/images/facility-cricket.jpg')) list.add('assets/images/facility-cricket.jpg');
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
    } else if (name.contains('swim') || name.contains('aqua') || type.contains('swim')) {
      if (!list.contains('assets/images/facility-swimming.jpg')) list.add('assets/images/facility-swimming.jpg');
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
    } else if (name.contains('tennis') || type.contains('tennis')) {
      if (!list.contains('assets/images/facility-tennis.jpg')) list.add('assets/images/facility-tennis.jpg');
      if (!list.contains('assets/images/facility-badminton.jpg')) list.add('assets/images/facility-badminton.jpg');
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
    } else if (name.contains('basket') || type.contains('basket')) {
      if (!list.contains('assets/images/facility-basketball.jpg')) list.add('assets/images/facility-basketball.jpg');
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
    } else if (name.contains('turf') || name.contains('foot') || name.contains('soccer') || type.contains('foot') || type.contains('turf')) {
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
      if (!list.contains('assets/images/facility-cricket.jpg')) list.add('assets/images/facility-cricket.jpg');
    } else {
      if (!list.contains('assets/images/sports-hero.jpg')) list.add('assets/images/sports-hero.jpg');
      if (!list.contains('assets/images/facility-badminton.jpg')) list.add('assets/images/facility-badminton.jpg');
      if (!list.contains('assets/images/facility-basketball.jpg')) list.add('assets/images/facility-basketball.jpg');
    }
  }

  return list;
}

String getFacilityImageAsset(Facility facility) {
  final images = getFacilityImages(facility);
  return images.isNotEmpty ? images.first : 'assets/images/sports-hero.jpg';
}

Widget buildUniversalImage(
  String imageSrc, {
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
  Widget Function(BuildContext)? errorWidget,
}) {
  final fallback = errorWidget != null
      ? null
      : (BuildContext ctx, Object err, StackTrace? st) => Image.asset(
            'assets/images/sports-hero.jpg',
            width: width,
            height: height,
            fit: fit,
          );

  if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
    return Image.network(
      imageSrc,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (ctx, err, st) => errorWidget != null ? errorWidget(ctx) : fallback!(ctx, err, st),
    );
  } else if (imageSrc.startsWith('data:image')) {
    try {
      final commaIdx = imageSrc.indexOf(',');
      final base64Str = commaIdx != -1 ? imageSrc.substring(commaIdx + 1) : imageSrc;
      return Image.memory(
        base64Decode(base64Str),
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (ctx, err, st) => errorWidget != null ? errorWidget(ctx) : fallback!(ctx, err, st),
      );
    } catch (_) {
      return Image.asset('assets/images/sports-hero.jpg', width: width, height: height, fit: fit);
    }
  } else if (imageSrc.startsWith('/') || imageSrc.startsWith('uploads/')) {
    final fullUrl = ApiService().resolveImageUrl(imageSrc);
    return Image.network(
      fullUrl,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (ctx, err, st) => errorWidget != null ? errorWidget(ctx) : fallback!(ctx, err, st),
    );
  } else {
    return Image.asset(
      imageSrc,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (ctx, err, st) => errorWidget != null ? errorWidget(ctx) : fallback!(ctx, err, st),
    );
  }
}

class FacilityImageWidget extends StatelessWidget {
  final Facility facility;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const FacilityImageWidget({
    super.key,
    required this.facility,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final imageSrc = getFacilityImageAsset(facility);
    final img = buildUniversalImage(
      imageSrc,
      width: width,
      height: height,
      fit: fit,
      errorWidget: (ctx) => _buildEmojiFallback(facility),
    );

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: img);
    }
    return img;
  }

  Widget _buildEmojiFallback(Facility f) {
    return Container(
      width: width,
      height: height,
      color: AppTheme.primaryBg,
      child: Center(
        child: Text(f.emoji, style: TextStyle(fontSize: (height != null ? height! * 0.4 : 32))),
      ),
    );
  }
}

class FacilityImageCarousel extends StatefulWidget {
  final Facility facility;
  final double height;
  final BorderRadius? borderRadius;
  final VoidCallback? onTap;
  final List<Widget>? overlays;

  const FacilityImageCarousel({
    super.key,
    required this.facility,
    this.height = 180,
    this.borderRadius,
    this.onTap,
    this.overlays,
  });

  @override
  State<FacilityImageCarousel> createState() => _FacilityImageCarouselState();
}

class _FacilityImageCarouselState extends State<FacilityImageCarousel> {
  int _activeIndex = 0;
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final images = getFacilityImages(widget.facility);

    Widget content = SizedBox(
      height: widget.height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Swipeable PageView
          PageView.builder(
            controller: _pageController,
            itemCount: images.length,
            physics: const BouncingScrollPhysics(),
            onPageChanged: (idx) {
              setState(() => _activeIndex = idx);
            },
            itemBuilder: (context, index) {
              return buildUniversalImage(
                images[index],
                width: double.infinity,
                height: widget.height,
                fit: BoxFit.cover,
                errorWidget: (ctx) => Container(
                  color: AppTheme.primaryBg,
                  alignment: Alignment.center,
                  child: Text(widget.facility.emoji, style: const TextStyle(fontSize: 48)),
                ),
              );
            },
          ),

          // Subtle gradient overlay for readability
          const Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black38, Colors.transparent, Colors.black45],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.0, 0.5, 1.0],
                  ),
                ),
              ),
            ),
          ),

          // Custom Overlays (e.g. court tag, availability badge)
          if (widget.overlays != null) ...widget.overlays!,

          // Dot indicators & page counter
          if (images.length > 1)
            Positioned(
              bottom: 10,
              left: 0,
              right: 0,
              child: IgnorePointer(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(images.length, (idx) {
                    final isActive = _activeIndex == idx;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeOutCubic,
                      width: isActive ? 18 : 6,
                      height: 5,
                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                      decoration: BoxDecoration(
                        color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.35),
                            blurRadius: 3,
                          ),
                        ],
                      ),
                    );
                  }),
                ),
              ),
            ),

          // Photo count badge in top-right or swipe hints
          if (images.length > 1)
            Positioned(
              bottom: 8,
              right: 12,
              child: IgnorePointer(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.photo_library_outlined, size: 11, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(
                        '${_activeIndex + 1}/${images.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );

    if (widget.borderRadius != null) {
      content = ClipRRect(borderRadius: widget.borderRadius!, child: content);
    }

    if (widget.onTap != null) {
      return InkWell(onTap: widget.onTap, child: content);
    }

    return content;
  }
}
