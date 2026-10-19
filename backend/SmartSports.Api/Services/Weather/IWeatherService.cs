using SmartSportsFacilityBooking.Dtos.Weather;

namespace SmartSportsFacilityBooking.Services.Weather;

public interface IWeatherService
{
    Task<CurrentWeatherDto> GetCurrentWeatherAsync(
        double? latitude = null,
        double? longitude = null,
        string? locationName = null,
        CancellationToken cancellationToken = default);

    Task<List<HourlyForecastPoint>> GetHourlyForecastAsync(
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default);

    Task<List<DailyForecastDto>> GetDailyForecastAsync(
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default);

    Task<OpenMeteoResponse?> GetRawForecastAsync(
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default);
}
