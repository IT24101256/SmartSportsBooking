using SmartSportsFacilityBooking.Services;
using Xunit;

namespace SmartSports.Api.Tests;

public class CancellationRefundServiceTests
{
    [Fact]
    public void CalculateRefund_WhenAtLeast24HoursPrior_Returns100PercentRefund()
    {
        // Reference time: 2026-09-28 10:00:00
        var now = new DateTime(2026, 9, 28, 10, 0, 0);
        // Booking session: 2026-09-29 11:00:00 (25 hours later)
        var bookingDate = new DateTime(2026, 9, 29);
        var startTime = new TimeSpan(11, 0, 0);
        var totalAmount = 4500m;

        var result = CancellationRefundService.CalculateRefund(
            bookingDate,
            startTime,
            totalAmount,
            "Championship Turf",
            now
        );

        Assert.Equal(100, result.RefundPercentage);
        Assert.Equal(4500m, result.RefundAmount);
        Assert.Equal("Full 100% Refund", result.RefundStatus);
        Assert.True(result.HoursPrior >= 24.0);
        Assert.True(result.IsOutdoorEligibleForRainCheck);
    }

    [Fact]
    public void CalculateRefund_WhenExactly24HoursPrior_Returns100PercentRefund()
    {
        var now = new DateTime(2026, 9, 28, 10, 0, 0);
        var bookingDate = new DateTime(2026, 9, 29);
        var startTime = new TimeSpan(10, 0, 0); // Exactly 24 hours
        var totalAmount = 3000m;

        var result = CancellationRefundService.CalculateRefund(
            bookingDate,
            startTime,
            totalAmount,
            "Indoor Basketball Arena",
            now
        );

        Assert.Equal(100, result.RefundPercentage);
        Assert.Equal(3000m, result.RefundAmount);
        Assert.Equal(24.0, result.HoursPrior);
        Assert.False(result.IsOutdoorEligibleForRainCheck);
    }

    [Fact]
    public void CalculateRefund_WhenBetween12And24HoursPrior_Returns50PercentRefund()
    {
        // Reference time: 2026-09-28 10:00:00
        var now = new DateTime(2026, 9, 28, 10, 0, 0);
        // Booking session: 2026-09-29 02:00:00 (16 hours later)
        var bookingDate = new DateTime(2026, 9, 29);
        var startTime = new TimeSpan(2, 0, 0);
        var totalAmount = 2400m;

        var result = CancellationRefundService.CalculateRefund(
            bookingDate,
            startTime,
            totalAmount,
            "Skyline Court",
            now
        );

        Assert.Equal(50, result.RefundPercentage);
        Assert.Equal(1200m, result.RefundAmount);
        Assert.Equal("50% Partial Refund", result.RefundStatus);
        Assert.True(result.HoursPrior >= 12.0 && result.HoursPrior < 24.0);
    }

    [Fact]
    public void CalculateRefund_WhenExactly12HoursPrior_Returns50PercentRefund()
    {
        var now = new DateTime(2026, 9, 28, 10, 0, 0);
        var bookingDate = new DateTime(2026, 9, 28);
        var startTime = new TimeSpan(22, 0, 0); // Exactly 12 hours
        var totalAmount = 1800m;

        var result = CancellationRefundService.CalculateRefund(
            bookingDate,
            startTime,
            totalAmount,
            "Riverside Tennis Club",
            now
        );

        Assert.Equal(50, result.RefundPercentage);
        Assert.Equal(900m, result.RefundAmount);
        Assert.Equal(12.0, result.HoursPrior);
    }

    [Fact]
    public void CalculateRefund_WhenLessThan12HoursPrior_ReturnsNonRefundable()
    {
        // Reference time: 2026-09-28 10:00:00
        var now = new DateTime(2026, 9, 28, 10, 0, 0);
        // Booking session: 2026-09-28 15:00:00 (5 hours later)
        var bookingDate = new DateTime(2026, 9, 28);
        var startTime = new TimeSpan(15, 0, 0);
        var totalAmount = 4500m;

        var result = CancellationRefundService.CalculateRefund(
            bookingDate,
            startTime,
            totalAmount,
            "Championship Turf",
            now
        );

        Assert.Equal(0, result.RefundPercentage);
        Assert.Equal(0m, result.RefundAmount);
        Assert.Equal("Non-refundable (0%)", result.RefundStatus);
        Assert.Equal(5.0, result.HoursPrior);
    }

    [Fact]
    public void CalculateRefund_IdentifiesOutdoorFacilitiesForRainCheck()
    {
        var now = new DateTime(2026, 9, 28, 10, 0, 0);
        var bookingDate = new DateTime(2026, 9, 29);
        var startTime = new TimeSpan(12, 0, 0);

        var cricket = CancellationRefundService.CalculateRefund(bookingDate, startTime, 5000m, "Main Cricket Ground", now);
        var football = CancellationRefundService.CalculateRefund(bookingDate, startTime, 4500m, "Championship Turf Football Field", now);
        var volleyball = CancellationRefundService.CalculateRefund(bookingDate, startTime, 2000m, "Beach Volleyball Court", now);
        var badminton = CancellationRefundService.CalculateRefund(bookingDate, startTime, 1200m, "Indoor Badminton Court", now);

        Assert.True(cricket.IsOutdoorEligibleForRainCheck);
        Assert.True(football.IsOutdoorEligibleForRainCheck);
        Assert.True(volleyball.IsOutdoorEligibleForRainCheck);
        Assert.False(badminton.IsOutdoorEligibleForRainCheck);
    }
}
