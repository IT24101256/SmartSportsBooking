using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Services;

public sealed class BookingSlotValidationResult
{
    public bool IsValid { get; init; }
    public string ErrorMessage { get; init; } = string.Empty;
    public Facility? Facility { get; init; }
    public DateTime BookingDate { get; init; }
    public TimeSpan EndTime { get; init; }
}

public interface IBookingSlotValidationService
{
    Task<BookingSlotValidationResult> ValidateAsync(
        int facilityId,
        DateTime bookingDate,
        TimeSpan startTime,
        int hoursNeeded,
        bool checkOverlap = true);
}

public sealed class BookingSlotValidationService : IBookingSlotValidationService
{
    private readonly AppDbContext _context;

    public BookingSlotValidationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BookingSlotValidationResult> ValidateAsync(
        int facilityId,
        DateTime bookingDate,
        TimeSpan startTime,
        int hoursNeeded,
        bool checkOverlap = true)
    {
        var facility = await _context.Facilities.FindAsync(facilityId);
        if (facility == null)
        {
            return Invalid("Facility not found.");
        }

        if (!facility.IsAvailable)
        {
            return Invalid("The selected facility is currently unavailable.");
        }

        var normalizedDate = DateTime.SpecifyKind(bookingDate.Date, DateTimeKind.Utc);
        var localNow = CancellationRefundService.GetCurrentLocalTime();

        if (normalizedDate.Date < localNow.Date)
        {
            return Invalid("Bookings cannot be made for a previous date.");
        }

        if (normalizedDate.Date == localNow.Date && startTime <= localNow.TimeOfDay)
        {
            return Invalid("Bookings cannot start before the current time.");
        }

        if (startTime.Minutes != 0 || startTime.Seconds != 0 ||
            startTime < TimeSpan.FromHours(8) || startTime >= TimeSpan.FromHours(24))
        {
            return Invalid("Bookings must start on a whole hour between 08:00 and 23:00.");
        }

        if (hoursNeeded < 1 || hoursNeeded > 8)
        {
            return Invalid("Bookings must be for between one and eight whole hours.");
        }

        var endTime = startTime.Add(TimeSpan.FromHours(hoursNeeded));
        if (endTime > TimeSpan.FromHours(24))
        {
            return Invalid("Bookings must end by midnight.");
        }

        var schedules = await _context.FacilitySchedules
            .Where(s => s.FacilityId == facilityId && s.DayOfWeek == normalizedDate.DayOfWeek)
            .ToListAsync();

        if (schedules.Count > 0 && !schedules.Any(s => s.StartTime <= startTime && s.EndTime >= endTime))
        {
            return Invalid("The requested time is outside the facility schedule.");
        }

        if (checkOverlap)
        {
            var hasOverlap = await _context.Bookings.AnyAsync(b =>
                b.FacilityId == facilityId &&
                b.BookingDate == normalizedDate &&
                b.StartTime < endTime &&
                b.EndTime > startTime &&
                b.Status != "Cancelled");

            if (hasOverlap)
            {
                return Invalid("This facility is already booked for that time.");
            }
        }

        return new BookingSlotValidationResult
        {
            IsValid = true,
            Facility = facility,
            BookingDate = normalizedDate,
            EndTime = endTime
        };
    }

    private static BookingSlotValidationResult Invalid(string message) => new()
    {
        IsValid = false,
        ErrorMessage = message
    };
}
