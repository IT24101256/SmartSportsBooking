using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSportsFacilityBooking.Dtos.Weather;
using SmartSportsFacilityBooking.Services.Weather;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WeatherController : ControllerBase
{
    private readonly IWeatherService _weatherService;
    private readonly IWeatherMonitoringAgent _monitoringAgent;
    private readonly ILogger<WeatherController> _logger;

    public WeatherController(
        IWeatherService weatherService,
        IWeatherMonitoringAgent monitoringAgent,
        ILogger<WeatherController> logger)
    {
        _weatherService = weatherService;
        _monitoringAgent = monitoringAgent;
        _logger = logger;
    }

    /// <summary>
    /// Returns live current weather, 7-day forecast summary, and active weather risk alerts.
    /// </summary>
    [HttpGet("overview")]
    public async Task<ActionResult<WeatherOverviewDto>> GetOverview(CancellationToken cancellationToken)
    {
        var overview = await _monitoringAgent.GetWeatherOverviewAsync(cancellationToken);
        return Ok(overview);
    }

    /// <summary>
    /// Explicit alias for Admin dashboard compliance: GET /api/admin/weather-overview
    /// </summary>
    [HttpGet("/api/admin/weather-overview")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<WeatherOverviewDto>> GetAdminOverview(CancellationToken cancellationToken)
    {
        var overview = await _monitoringAgent.GetWeatherOverviewAsync(cancellationToken);
        return Ok(overview);
    }

    /// <summary>
    /// Returns current weather conditions at the sports complex.
    /// </summary>
    [HttpGet("current")]
    public async Task<ActionResult<CurrentWeatherDto>> GetCurrentWeather(
        [FromQuery] double? lat = null,
        [FromQuery] double? lon = null,
        CancellationToken cancellationToken = default)
    {
        var current = await _weatherService.GetCurrentWeatherAsync(lat, lon, cancellationToken: cancellationToken);
        return Ok(current);
    }

    /// <summary>
    /// Returns 7-day daily weather forecast.
    /// </summary>
    [HttpGet("forecast")]
    public async Task<ActionResult<List<DailyForecastDto>>> GetForecast(
        [FromQuery] double? lat = null,
        [FromQuery] double? lon = null,
        CancellationToken cancellationToken = default)
    {
        var forecast = await _weatherService.GetDailyForecastAsync(lat, lon, cancellationToken);
        return Ok(forecast);
    }

    /// <summary>
    /// Returns all current active weather risk alerts.
    /// </summary>
    [HttpGet("alerts")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public ActionResult<List<WeatherRiskAlertDto>> GetActiveAlerts()
    {
        var alerts = _monitoringAgent.GetCachedAlerts();
        return Ok(alerts);
    }

    /// <summary>
    /// Forces an immediate re-evaluation of weather risk alerts against upcoming bookings.
    /// </summary>
    [HttpPost("evaluate")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<List<WeatherRiskAlertDto>>> TriggerEvaluation(CancellationToken cancellationToken)
    {
        _logger.LogInformation("[WeatherController] Manual evaluation triggered by admin.");
        var alerts = await _monitoringAgent.EvaluateWeatherRisksAsync(cancellationToken);
        return Ok(alerts);
    }
}
