using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;
using SmartSportsFacilityBooking.Services;

namespace SmartSports.Api.Tests;

public class BookingSlotValidationServiceTests
{
    [Fact]
    public async Task ValidateAsync_rejects_slot_outside_configured_schedule()
    {
        await using var context = CreateContext();
        var date = DateTime.UtcNow.Date.AddDays(1);
        context.Facilities.Add(new Facility { Id = 1, Name = "Test Court", IsAvailable = true });
        context.FacilitySchedules.Add(new FacilitySchedule
        {
            FacilityId = 1,
            DayOfWeek = date.DayOfWeek,
            StartTime = TimeSpan.FromHours(9),
            EndTime = TimeSpan.FromHours(17)
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).ValidateAsync(
            1,
            date,
            TimeSpan.FromHours(8),
            1);

        Assert.False(result.IsValid);
        Assert.Contains("outside the facility schedule", result.ErrorMessage);
    }

    [Fact]
    public async Task ValidateAsync_rejects_overlapping_active_booking()
    {
        await using var context = CreateContext();
        var date = DateTime.UtcNow.Date.AddDays(1);
        context.Facilities.Add(new Facility { Id = 1, Name = "Test Court", IsAvailable = true });
        context.Bookings.Add(new Booking
        {
            FacilityId = 1,
            UserId = 1,
            BookingDate = date,
            StartTime = TimeSpan.FromHours(10),
            EndTime = TimeSpan.FromHours(12),
            Status = "Confirmed"
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).ValidateAsync(
            1,
            date,
            TimeSpan.FromHours(11),
            1);

        Assert.False(result.IsValid);
        Assert.Contains("already booked", result.ErrorMessage);
    }

    [Fact]
    public async Task ValidateAsync_accepts_available_slot_within_schedule()
    {
        await using var context = CreateContext();
        var date = DateTime.UtcNow.Date.AddDays(1);
        context.Facilities.Add(new Facility { Id = 1, Name = "Test Court", IsAvailable = true });
        context.FacilitySchedules.Add(new FacilitySchedule
        {
            FacilityId = 1,
            DayOfWeek = date.DayOfWeek,
            StartTime = TimeSpan.FromHours(9),
            EndTime = TimeSpan.FromHours(17)
        });
        await context.SaveChangesAsync();

        var result = await CreateService(context).ValidateAsync(
            1,
            date,
            TimeSpan.FromHours(10),
            2);

        Assert.True(result.IsValid);
        Assert.Equal(TimeSpan.FromHours(12), result.EndTime);
    }

    private static BookingSlotValidationService CreateService(AppDbContext context) =>
        new(context);

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
