namespace SmartSportsFacilityBooking.Services;

public record CancellationRefundResult(
    int RefundPercentage,
    decimal RefundAmount,
    string RefundStatus,
    double HoursPrior,
    string PolicyTier,
    string PolicyExplanation,
    bool IsOutdoorEligibleForRainCheck
);

public static class CancellationRefundService
{
    private static readonly string[] OutdoorKeywords = new[]
    {
        "cricket",
        "football",
        "turf",
        "volleyball",
        "field",
        "ground"
    };

    public static TimeZoneInfo SriLankaTimeZone =>
        TimeZoneInfo.CreateCustomTimeZone("SLST", TimeSpan.FromMinutes(330), "Sri Lanka", "Sri Lanka");

    public static DateTime GetCurrentLocalTime()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SriLankaTimeZone);
    }

    public static bool IsBookingExpired(DateTime bookingDate, TimeSpan startTime, DateTime? referenceNow = null)
    {
        var now = referenceNow ?? GetCurrentLocalTime();
        var sessionStart = new DateTime(
            bookingDate.Year,
            bookingDate.Month,
            bookingDate.Day,
            startTime.Hours,
            startTime.Minutes,
            0
        );
        return sessionStart <= now;
    }

    public static CancellationRefundResult CalculateRefund(
        DateTime bookingDate,
        TimeSpan startTime,
        decimal totalAmount,
        string? facilityName = null,
        DateTime? referenceNow = null)
    {
        var now = referenceNow ?? GetCurrentLocalTime();

        var sessionStart = new DateTime(
            bookingDate.Year,
            bookingDate.Month,
            bookingDate.Day,
            startTime.Hours,
            startTime.Minutes,
            0
        );

        var hoursPrior = (sessionStart - now).TotalHours;

        bool isOutdoor = !string.IsNullOrWhiteSpace(facilityName) &&
            OutdoorKeywords.Any(keyword => facilityName.Contains(keyword, StringComparison.OrdinalIgnoreCase));

        if (hoursPrior >= 24.0)
        {
            return new CancellationRefundResult(
                RefundPercentage: 100,
                RefundAmount: totalAmount,
                RefundStatus: "Full 100% Refund",
                HoursPrior: Math.Round(hoursPrior, 1),
                PolicyTier: "100% Refund (>= 24 Hours)",
                PolicyExplanation: "Cancellations made at least 24 hours prior to the scheduled start time receive a full 100% refund or credit voucher.",
                IsOutdoorEligibleForRainCheck: isOutdoor
            );
        }
        else if (hoursPrior >= 12.0)
        {
            var partialAmount = Math.Round(totalAmount * 0.50m, 2);
            return new CancellationRefundResult(
                RefundPercentage: 50,
                RefundAmount: partialAmount,
                RefundStatus: "50% Partial Refund",
                HoursPrior: Math.Round(hoursPrior, 1),
                PolicyTier: "50% Refund (12 - 24 Hours)",
                PolicyExplanation: "Cancellations made between 12 and 24 hours prior receive a 50% refund.",
                IsOutdoorEligibleForRainCheck: isOutdoor
            );
        }
        else
        {
            return new CancellationRefundResult(
                RefundPercentage: 0,
                RefundAmount: 0m,
                RefundStatus: "Non-refundable (0%)",
                HoursPrior: Math.Max(0, Math.Round(hoursPrior, 1)),
                PolicyTier: "Non-refundable (< 12 Hours)",
                PolicyExplanation: "Cancellations made less than 12 hours before the session or no-shows cannot be refunded per club policy.",
                IsOutdoorEligibleForRainCheck: isOutdoor
            );
        }
    }
}
