using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.AI.Services;

public class AiToolsService : IAiToolsService
{
    private readonly AppDbContext _context;

    public AiToolsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<string> GetLiveKnowledgeContextJsonAsync()
    {
        var categories = await _context.SportCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                Facilities = c.Facilities
                    .Where(f => f.IsAvailable)
                    .OrderBy(f => f.Name)
                    .Select(f => new
                    {
                        f.Id,
                        f.Name,
                        f.Description,
                        f.CourtType,
                        f.HourlyRate,
                        Equipment = f.FacilityEquipments
                            .Where(link => link.Equipment.IsAvailable)
                            .OrderBy(link => link.Equipment.Name)
                            .Select(link => new
                            {
                                link.Equipment.Id,
                                link.Equipment.Name,
                                link.Equipment.Description,
                                link.Equipment.HourlyRate,
                                link.Equipment.TotalStock
                            })
                    })
            })
            .ToListAsync();

        var uncategorizedEquipment = await _context.Equipments
            .AsNoTracking()
            .Where(e => e.IsAvailable && e.SportCategoryNavigation == null)
            .OrderBy(e => e.Name)
            .Select(e => new
            {
                e.Id,
                e.Name,
                e.Description,
                e.HourlyRate,
                e.TotalStock,
                SportCategory = e.SportCategory
            })
            .ToListAsync();

        return JsonSerializer.Serialize(new
        {
            GeneratedAtUtc = DateTime.UtcNow,
            SportCategories = categories,
            UncategorizedEquipment = uncategorizedEquipment
        });
    }

    public async Task<string> GetFacilitiesJsonAsync()
    {
        var slNow = CancellationRefundService.GetCurrentLocalTime();
        var todayUtc = DateTime.SpecifyKind(slNow.Date, DateTimeKind.Utc);
        var currentTime = slNow.TimeOfDay;

        var facilities = await _context.Facilities
            .OrderBy(f => f.Name)
            .Select(f => new
            {
                f.Id,
                f.Name,
                CourtType = string.IsNullOrWhiteSpace(f.CourtType) ? "Indoor" : f.CourtType,
                f.HourlyRate,
                f.IsAvailable,
                f.Description,
                EquipmentsProvided = f.EquipmentsProvided ?? ""
            })
            .ToListAsync();

        var activeBookings = await _context.Bookings
            .Where(b => b.BookingDate == todayUtc &&
                        b.Status != "Cancelled" &&
                        b.StartTime <= currentTime &&
                        b.EndTime > currentTime)
            .Select(b => new { b.FacilityId, b.EndTime })
            .ToListAsync();

        var activeMap = activeBookings
            .GroupBy(b => b.FacilityId)
            .ToDictionary(g => g.Key, g => g.First());

        var items = facilities.Select(f =>
        {
            var isOccupied = activeMap.TryGetValue(f.Id, out var active);
            return new
            {
                f.Id,
                f.Name,
                f.CourtType,
                f.HourlyRate,
                RateFormatted = $"LKR {f.HourlyRate:N0}/hour",
                f.IsAvailable,
                CurrentStatus = !f.IsAvailable ? "Under Maintenance" : isOccupied ? "Currently In Play" : "Available Now",
                SessionUntil = isOccupied ? active?.EndTime.ToString(@"hh\:mm") : null,
                f.Description,
                f.EquipmentsProvided
            };
        });

        return JsonSerializer.Serialize(items, new JsonSerializerOptions { WriteIndented = false });
    }

    public async Task<string> GetFacilityDetailsJsonAsync(int facilityId)
    {
        var facility = await _context.Facilities.FindAsync(facilityId);
        if (facility == null)
        {
            return JsonSerializer.Serialize(new { error = "Facility not found" });
        }

        var slNow = CancellationRefundService.GetCurrentLocalTime();
        var todayUtc = DateTime.SpecifyKind(slNow.Date, DateTimeKind.Utc);
        var currentTime = slNow.TimeOfDay;

        var isOccupied = await _context.Bookings.AnyAsync(b =>
            b.FacilityId == facilityId &&
            b.BookingDate == todayUtc &&
            b.Status != "Cancelled" &&
            b.StartTime <= currentTime &&
            b.EndTime > currentTime);

        var reviews = await _context.BookingReviews
            .Where(r => r.Booking != null && r.Booking.FacilityId == facilityId)
            .Select(r => r.Rating)
            .ToListAsync();

        double? avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(), 1) : null;

        var equipments = await _context.Equipments
            .Where(e => e.FacilityEquipments.Any(link => link.FacilityId == facilityId) ||
                e.SportCategory.ToLower() == facility.SportCategory.ToLower())
            .Select(e => new
            {
                e.Id,
                e.Name,
                e.HourlyRate,
                RateFormatted = $"LKR {e.HourlyRate:N0}/hour",
                e.IsAvailable,
                e.TotalStock
            })
            .ToListAsync();

        var details = new
        {
            facility.Id,
            facility.Name,
            CourtType = string.IsNullOrWhiteSpace(facility.CourtType) ? "Indoor" : facility.CourtType,
            facility.HourlyRate,
            RateFormatted = $"LKR {facility.HourlyRate:N0}/hour",
            facility.IsAvailable,
            CurrentStatus = !facility.IsAvailable ? "Under Maintenance" : isOccupied ? "Currently In Play" : "Available Now",
            AverageRating = avgRating,
            ReviewCount = reviews.Count,
            facility.Description,
            facility.Faq,
            facility.EquipmentsProvided,
            AvailableEquipments = equipments
        };

        return JsonSerializer.Serialize(details);
    }

    public async Task<string> GetCurrentAvailabilityJsonAsync(int facilityId, DateTime date)
    {
        var facility = await _context.Facilities.FindAsync(facilityId);
        if (facility == null)
        {
            return JsonSerializer.Serialize(new { error = "Facility not found" });
        }

        var day = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var bookings = await _context.Bookings
            .Where(b => b.FacilityId == facilityId && b.BookingDate == day && b.Status != "Cancelled")
            .Select(b => new { b.StartTime, b.EndTime })
            .ToListAsync();

        var schedules = await _context.FacilitySchedules
            .Where(s => s.FacilityId == facilityId && s.DayOfWeek == day.DayOfWeek)
            .ToListAsync();

        var slNow = CancellationRefundService.GetCurrentLocalTime();
        var todayLocalDate = slNow.Date;
        var currentLocalTime = slNow.TimeOfDay;

        var slots = Enumerable.Range(8, 16).Select(hour =>
        {
            var start = TimeSpan.FromHours(hour);
            var end = start.Add(TimeSpan.FromHours(1));
            var isPast = day.Date < todayLocalDate || (day.Date == todayLocalDate && start <= currentLocalTime);
            var isBooked = bookings.Any(b => b.StartTime < end && b.EndTime > start);
            var isWithinSchedule = schedules.Count == 0 || schedules.Any(s => s.StartTime <= start && s.EndTime >= end);
            var status = isPast ? "Past" : !isWithinSchedule ? "Closed" : isBooked ? "Booked" : "Available";

            return new
            {
                startTime = start.ToString(@"hh\:mm"),
                endTime = end.ToString(@"hh\:mm"),
                status
            };
        }).ToList();

        var result = new
        {
            facilityId = facility.Id,
            facilityName = facility.Name,
            date = day.ToString("yyyy-MM-dd"),
            hourlyRate = facility.HourlyRate,
            availableSlotsCount = slots.Count(s => s.status == "Available"),
            slots
        };

        return JsonSerializer.Serialize(result);
    }

    public async Task<string> GetUserBookingsJsonAsync(int userId)
    {
        var bookings = await _context.Bookings
            .Include(b => b.Facility)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BookingDate)
            .ThenByDescending(b => b.StartTime)
            .Take(10)
            .Select(b => new
            {
                b.Id,
                Facility = b.Facility != null ? b.Facility.Name : "Facility",
                Date = b.BookingDate.ToString("yyyy-MM-dd"),
                StartTime = b.StartTime.ToString(@"hh\:mm"),
                EndTime = b.EndTime.ToString(@"hh\:mm"),
                b.HoursNeeded,
                b.TotalAmount,
                b.PaymentMethod,
                b.PaymentStatus,
                b.Status,
                b.RefundStatus,
                b.IsRescheduleRequested,
                b.RescheduleReason
            })
            .ToListAsync();

        return JsonSerializer.Serialize(bookings);
    }

    public async Task<string> GetBookingStatusJsonAsync(int bookingId, int userId, bool isPrivileged)
    {
        var booking = await _context.Bookings
            .Include(b => b.Facility)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
        {
            return JsonSerializer.Serialize(new { error = "Booking not found" });
        }

        if (!isPrivileged && booking.UserId != userId)
        {
            return JsonSerializer.Serialize(new { error = "Unauthorized to access this booking" });
        }

        var quote = CancellationRefundService.CalculateRefund(
            booking.BookingDate,
            booking.StartTime,
            booking.TotalAmount,
            booking.Facility?.Name);

        var result = new
        {
            booking.Id,
            Facility = booking.Facility?.Name,
            Date = booking.BookingDate.ToString("yyyy-MM-dd"),
            StartTime = booking.StartTime.ToString(@"hh\:mm"),
            EndTime = booking.EndTime.ToString(@"hh\:mm"),
            booking.HoursNeeded,
            booking.TotalAmount,
            booking.PaymentMethod,
            booking.PaymentStatus,
            booking.Status,
            booking.CancellationReason,
            RefundQuote = new
            {
                quote.RefundPercentage,
                quote.RefundAmount,
                quote.RefundStatus,
                quote.PolicyExplanation
            },
            booking.IsRescheduleRequested,
            booking.RescheduleReason
        };

        return JsonSerializer.Serialize(result);
    }
}
