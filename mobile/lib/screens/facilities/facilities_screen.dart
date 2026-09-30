import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/facility.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/facility_images.dart';
import '../../widgets/edit_facility_modal.dart';

class FacilitiesScreen extends StatefulWidget {
  final List<Facility> facilities;
  final bool isLoading;
  final VoidCallback onRefresh;
  final Function(Facility) onSelectFacility;
  final Function(Facility) onQuickBook;

  const FacilitiesScreen({
    super.key,
    required this.facilities,
    required this.isLoading,
    required this.onRefresh,
    required this.onSelectFacility,
    required this.onQuickBook,
  });

  @override
  State<FacilitiesScreen> createState() => _FacilitiesScreenState();
}

class _FacilitiesScreenState extends State<FacilitiesScreen> {
  String _selectedSport = 'All';
  String _selectedCourtType = 'All'; // 'All', 'Indoor', 'Outdoor'
  String _searchQuery = '';

  final List<String> _sportsList = [
    'All',
    'Badminton',
    'Football',
    'Cricket',
    'Tennis',
    'Basketball',
    'Swimming',
    'Fitness',
  ];

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('#,##0', 'en_US');

    // Filter computation
    final filtered = widget.facilities.filter((f) {
      if (_selectedSport != 'All') {
        final fType = '${f.type} ${f.name}'.toLowerCase();
        if (!fType.contains(_selectedSport.toLowerCase())) return false;
      }

      if (_selectedCourtType != 'All') {
        if (_selectedCourtType == 'Outdoor' && !f.isOutdoor) return false;
        if (_selectedCourtType == 'Indoor' && f.isOutdoor) return false;
      }

      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final match = f.name.toLowerCase().contains(q) ||
            f.type.toLowerCase().contains(q) ||
            f.location.toLowerCase().contains(q);
        if (!match) return false;
      }

      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        children: [
          // Search Bar
          TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Search by facility, sport, or venue...',
              prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textMuted),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() => _searchQuery = ''),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 14),

          // Sport Category Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _sportsList.map((sport) {
                final isSelected = _selectedSport == sport;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(sport),
                    selected: isSelected,
                    onSelected: (val) {
                      if (val) setState(() => _selectedSport = sport);
                    },
                    selectedColor: AppTheme.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppTheme.deepHeading,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Court Type Filter Chips (Indoor / Outdoor)
          Row(
            children: [
              _courtTypeChip('All Venues', 'All'),
              const SizedBox(width: 8),
              _courtTypeChip('🏟️ Indoor', 'Indoor'),
              const SizedBox(width: 8),
              _courtTypeChip('🌿 Outdoor / Turf', 'Outdoor'),
            ],
          ),
          const SizedBox(height: 16),

          // Results Count
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Showing ${filtered.length} facilities',
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textMuted, fontSize: 13),
              ),
              if (_selectedSport != 'All' || _selectedCourtType != 'All' || _searchQuery.isNotEmpty)
                TextButton(
                  onPressed: () {
                    setState(() {
                      _selectedSport = 'All';
                      _selectedCourtType = 'All';
                      _searchQuery = '';
                    });
                  },
                  child: const Text('Clear Filters', style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
          const SizedBox(height: 10),

          if (filtered.isEmpty)
            Container(
              padding: const EdgeInsets.all(40),
              alignment: Alignment.center,
              child: const Column(
                children: [
                  Icon(Icons.search_off_rounded, size: 48, color: AppTheme.textMuted),
                  SizedBox(height: 12),
                  Text('No facilities match your search criteria.', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.deepHeading)),
                  SizedBox(height: 4),
                  Text('Try switching sport categories or clearing filters.', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                ],
              ),
            )
          else
            ...filtered.map((f) {
              return Container(
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppTheme.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Swipeable image carousel (swap left or right to change image)
                    FacilityImageCarousel(
                      facility: f,
                      height: 175,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      onTap: () => widget.onSelectFacility(f),
                      overlays: [
                        // Court Type Badge (Top-Left)
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.65),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 4),
                              ],
                            ),
                            child: Text(
                              f.isOutdoor ? '🌳 Outdoor / Turf' : '🏢 Indoor Arena',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),

                        // Availability Status Badge (Top-Right)
                        Positioned(
                          top: 12,
                          right: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
                            decoration: BoxDecoration(
                              color: f.isAvailable ? Colors.white.withValues(alpha: 0.95) : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 6),
                              ],
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
                        ),

                        // Rating Pill (Bottom-Left)
                        Positioned(
                          bottom: 10,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.65),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                                const SizedBox(width: 3),
                                Text(
                                  f.rating != null ? f.rating!.toStringAsFixed(1) : '5.0',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11),
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  '(${f.ratingCount > 0 ? f.ratingCount : 12})',
                                  style: const TextStyle(color: Colors.white70, fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Card Content
                    InkWell(
                      onTap: () => widget.onSelectFacility(f),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    f.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 17,
                                      color: AppTheme.deepHeading,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryBg,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    f.type,
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.schedule, size: 14, color: AppTheme.textMuted),
                                const SizedBox(width: 4),
                                Text(
                                  'Hours: ${f.openingTime} - ${f.closingTime}',
                                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                ),
                                const SizedBox(width: 12),
                                const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textMuted),
                                const SizedBox(width: 2),
                                Expanded(
                                  child: Text(
                                    f.location,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 22),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Hourly Rate', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                                Text(
                                  'LKR ${currencyFmt.format(f.hourlyRate)} / hr',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: AppTheme.primary,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                if (ApiService().currentUser?.isAdmin == true) ...[
                                  IconButton(
                                    icon: const Icon(Icons.edit_note_rounded, color: AppTheme.primary, size: 22),
                                    tooltip: 'Edit Facility',
                                    onPressed: () => EditFacilityModal.show(context, f, widget.onRefresh),
                                  ),
                                  const SizedBox(width: 4),
                                ],
                                OutlinedButton(
                                  onPressed: () => widget.onSelectFacility(f),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                  child: const Text('Details', style: TextStyle(fontSize: 13)),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: () => widget.onQuickBook(f),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  ),
                                  child: const Text('Book', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
        ],
      ),
    );
  }

  Widget _courtTypeChip(String label, String value) {
    final isSelected = _selectedCourtType == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (val) {
        if (val) setState(() => _selectedCourtType = value);
      },
      selectedColor: AppTheme.primaryBg,
      labelStyle: TextStyle(
        color: isSelected ? AppTheme.primary : AppTheme.deepHeading,
        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
        fontSize: 12,
      ),
    );
  }
}

extension FacilityFilterExtension on List<Facility> {
  List<Facility> filter(bool Function(Facility) test) {
    return where(test).toList();
  }
}
