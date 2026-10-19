using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Weather;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Services.Weather;

public class WeatherMonitoringAgent : IWeatherMonitoringAgent
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWeatherService _weatherService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WeatherMonitoringAgent> _logger;

    private readonly ConcurrentDictionary<int, WeatherRiskAlertDto> _activeAlerts = new();
    private DateTime _lastEvaluatedAtUtc = DateTime.MinValue;
    private readonly SemaphoreSlim _evalLock = new(1, 1);

    public WeatherMonitoringAgent(
        IServiceScopeFactory scopeFactory,
        IWeatherService weatherService,
        IConfiguration configuration,
        ILogger<WeatherMonitoringAgent> logger)
    {
        _scopeFactory = scopeFactory;
        _weatherService = weatherService;
        _configuration = configuration;
        _logger = logger;
    }

    private int ForecastWindowDays =>
        _configuration.GetValue<int>("WeatherAgent:ForecastWindowDays", 7);

    private int RainProbabilityThreshold =>
        _configuration.GetValue<int>("WeatherAgent:RainProbabilityThreshold", 60);

    private double HeavyPrecipitationThresholdMm =>
        _configuration.GetValue<double>("WeatherAgent:HeavyPrecipitationThresholdMm", 5.0);

    private double HighWindThresholdKmh =>
        _configuration.GetValue<double>("WeatherAgent:HighWindThresholdKmh", 45.0);

    public IReadOnlyList<WeatherRiskAlertDto> GetCachedAlerts()
    {
        return _activeAlerts.Values.OrderBy(a => a.BookingDate).ThenBy(a => a.StartTime).ToList();
    }

    public async Task<List<WeatherRiskAlertDto>> EvaluateWeatherRisksAsync(CancellationToken cancellationToken = default)
    {
        // Prevent concurrent evaluations
        if (!await _evalLock.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken))
        {
            return GetCachedAlerts().ToList();
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var localNow = CancellationRefundService.GetCurrentLocalTime();
            var localToday = localNow.Date;
            var localEndDate = localToday.AddDays(ForecastWindowDays);

            // Ensure UTC DateTimeKind for PostgreSQL 'timestamp with time zone' parameter binding
            var queryStartUtc = DateTime.SpecifyKind(localToday, DateTimeKind.Utc);
            var queryEndUtc = DateTime.SpecifyKind(localEndDate, DateTimeKind.Utc);

            // Fetch upcoming active bookings within the forecast window
            var upcomingBookings = await dbContext.Bookings
                .Include(b => b.Facility)
                .Where(b => b.Status != "Cancelled")
                .Where(b => b.BookingDate >= queryStartUtc && b.BookingDate <= queryEndUtc)
                .ToListAsync(cancellationToken);

            // Fetch hourly forecast for the sports complex
            var hourlyForecast = await _weatherService.GetHourlyForecastAsync(cancellationToken: cancellationToken);

            var newAlertsMap = new Dictionary<int, WeatherRiskAlertDto>();

            foreach (var booking in upcomingBookings)
            {
                // Verify booking is not expired
                var sessionStart = new DateTime(
                    booking.BookingDate.Year,
                    booking.BookingDate.Month,
                    booking.BookingDate.Day,
                    booking.StartTime.Hours,
                    booking.StartTime.Minutes,
                    0);

                if (sessionStart <= localNow)
                {
                    continue; // Skip past or already expired sessions
                }

                // Check court type and sport sensitivity
                var facility = booking.Facility;
                var courtType = facility?.CourtType ?? "Outdoor";
                var isOutdoor = courtType.Equals("Outdoor", StringComparison.OrdinalIgnoreCase) ||
                                (facility != null && IsOutdoorSport(facility.SportCategory, facility.Name));

                var sportCat = (facility?.SportCategory ?? "").Trim();
                var isCricket = sportCat.Contains("cricket", StringComparison.OrdinalIgnoreCase) ||
                                (facility?.Name ?? "").Contains("cricket", StringComparison.OrdinalIgnoreCase);

                // Find overlapping forecast hours
                var bookingDateOnly = booking.BookingDate.Date;
                var startHour = booking.StartTime.Hours;
                var endHour = booking.EndTime.Hours > 0 ? booking.EndTime.Hours : startHour + booking.HoursNeeded;
                if (endHour <= startHour) endHour = startHour + Math.Max(1, booking.HoursNeeded);

                var overlappingHours = hourlyForecast.Where(h =>
                    h.DateTimeLocal.Date == bookingDateOnly &&
                    h.DateTimeLocal.Hour >= startHour &&
                    h.DateTimeLocal.Hour < endHour
                ).ToList();

                if (!overlappingHours.Any())
                {
                    continue;
                }

                // Risk analysis on overlapping forecast hours
                var hasThunderstorm = overlappingHours.Any(h => h.IsThunderstorm || h.WeatherCode >= 95);
                var maxPrecip = overlappingHours.Max(h => h.PrecipitationMm);
                var maxRainProb = overlappingHours.Max(h => h.RainProbability);
                var maxWind = overlappingHours.Max(h => h.WindSpeedKmh);
                var worstCode = overlappingHours.OrderByDescending(h => h.WeatherCode).First().WeatherCode;
                var worstCondition = WeatherCodeHelper.Parse(worstCode).Condition;

                string? riskSeverity = null;
                string? reason = null;

                if (!isOutdoor)
                {
                    // Indoor courts: only extreme severe weather with violent conditions
                    if (hasThunderstorm && maxWind >= 65.0)
                    {
                        riskSeverity = "Medium";
                        reason = $"Severe storm with {Math.Round(maxWind)} km/h gale winds may impact facility access.";
                    }
                    // Ordinary rain/drizzle is completely ignored for indoor courts!
                }
                else
                {
                    // Outdoor courts (Football, Cricket, Turf, Tennis, Swimming)
                    if (hasThunderstorm)
                    {
                        riskSeverity = "High";
                        reason = $"Thunderstorm ({worstCondition}) forecasted during outdoor session. Unsafe for play.";
                    }
                    else if (maxPrecip >= HeavyPrecipitationThresholdMm || (maxRainProb >= 80 && maxPrecip >= 3.0))
                    {
                        riskSeverity = "High";
                        reason = $"Heavy rain ({maxPrecip:F1} mm, {maxRainProb}% chance) predicted during game.";
                    }
                    else if (maxPrecip >= 2.0 || maxRainProb >= RainProbabilityThreshold)
                    {
                        riskSeverity = "Medium";
                        reason = $"Rain expected ({maxPrecip:F1} mm, {maxRainProb}% chance) across booked hours.";
                    }
                    else if (isCricket && (maxRainProb >= 40 || maxPrecip >= 0.5))
                    {
                        // Cricket is especially sensitive to pitch dampness
                        riskSeverity = "Medium";
                        reason = $"Drizzle / damp conditions ({maxRainProb}% rain chance) hazardous for cricket pitch.";
                    }
                    else if (maxWind >= HighWindThresholdKmh)
                    {
                        riskSeverity = "Medium";
                        reason = $"High wind gusts ({Math.Round(maxWind)} km/h) impacting outdoor play.";
                    }
                }

                if (riskSeverity != null && reason != null)
                {
                    var isRescheduleOffered = booking.IsRescheduleRequested ||
                                              booking.Status.Equals("RescheduleRequested", StringComparison.OrdinalIgnoreCase);

                    var alertDto = new WeatherRiskAlertDto
                    {
                        BookingId = booking.Id,
                        FacilityId = booking.FacilityId,
                        FacilityName = facility?.Name ?? "Sports Arena",
                        CourtType = courtType,
                        SportCategory = sportCat.Length > 0 ? sportCat : "General Sport",
                        CustomerName = booking.CustomerName,
                        ContactNumber = booking.ContactNumber,
                        BookingDate = booking.BookingDate,
                        StartTime = booking.StartTime,
                        EndTime = booking.EndTime,
                        FormattedDate = booking.BookingDate.ToString("ddd, MMM d, yyyy"),
                        FormattedTimeSlot = $"{booking.StartTime:hh\\:mm} - {booking.EndTime:hh\\:mm} ({booking.HoursNeeded}h)",
                        ForecastCondition = worstCondition,
                        WeatherCode = worstCode,
                        RainProbability = maxRainProb,
                        PrecipitationMm = maxPrecip,
                        WindSpeedKmh = maxWind,
                        RiskSeverity = riskSeverity,
                        WarningReason = reason,
                        IsRescheduleRequested = isRescheduleOffered,
                        RescheduleReason = booking.RescheduleReason,
                        AlertStatus = isRescheduleOffered ? "RescheduleOffered" : "Unresolved",
                        EvaluatedAtUtc = DateTime.UtcNow
                    };

                    newAlertsMap[booking.Id] = alertDto;
                }
            }

            // Synchronize active alerts map
            _activeAlerts.Clear();
            foreach (var kvp in newAlertsMap)
            {
                _activeAlerts[kvp.Key] = kvp.Value;
            }

            _lastEvaluatedAtUtc = DateTime.UtcNow;
            _logger.LogInformation("[WeatherAgent] Evaluated {Count} upcoming bookings. Generated {Alerts} weather risk alerts.",
                upcomingBookings.Count, _activeAlerts.Count);

            return GetCachedAlerts().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WeatherAgent] Error occurred during weather risk evaluation.");
            return GetCachedAlerts().ToList();
        }
        finally
        {
            _evalLock.Release();
        }
    }

    public async Task<WeatherOverviewDto> GetWeatherOverviewAsync(CancellationToken cancellationToken = default)
    {
        // Re-evaluate if never evaluated or older than 20 minutes
        if (_lastEvaluatedAtUtc == DateTime.MinValue || DateTime.UtcNow.Subtract(_lastEvaluatedAtUtc).TotalMinutes >= 20)
        {
            await EvaluateWeatherRisksAsync(cancellationToken);
        }

        var current = await _weatherService.GetCurrentWeatherAsync(cancellationToken: cancellationToken);
        var daily = await _weatherService.GetDailyForecastAsync(cancellationToken: cancellationToken);
        var alerts = GetCachedAlerts().ToList();

        // Count unresolved alerts (pending admin action)
        var unresolvedCount = alerts.Count(a => a.AlertStatus == "Unresolved");

        return new WeatherOverviewDto
        {
            Current = current,
            AlertsCount = unresolvedCount,
            Alerts = alerts,
            DailyForecast = daily,
            LastEvaluatedAtUtc = _lastEvaluatedAtUtc != DateTime.MinValue ? _lastEvaluatedAtUtc : DateTime.UtcNow,
            IsAvailable = true,
            Provider = "Open-Meteo"
        };
    }

    private static bool IsOutdoorSport(string sportCategory, string facilityName)
    {
        var combined = $"{sportCategory} {facilityName}".ToLowerInvariant();
        return combined.Contains("football") ||
               combined.Contains("cricket") ||
               combined.Contains("turf") ||
               combined.Contains("ground") ||
               combined.Contains("field") ||
               combined.Contains("pitch") ||
               combined.Contains("tennis");
    }
}
