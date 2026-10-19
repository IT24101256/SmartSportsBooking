using SmartSportsFacilityBooking.Dtos.Weather;

namespace SmartSportsFacilityBooking.Services.Weather;

public interface IWeatherMonitoringAgent
{
    Task<List<WeatherRiskAlertDto>> EvaluateWeatherRisksAsync(CancellationToken cancellationToken = default);
    Task<WeatherOverviewDto> GetWeatherOverviewAsync(CancellationToken cancellationToken = default);
    IReadOnlyList<WeatherRiskAlertDto> GetCachedAlerts();
}
