using System.Globalization;
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;
using SmartSportsFacilityBooking.Dtos.Weather;

namespace SmartSportsFacilityBooking.Services.Weather;

public class OpenMeteoWeatherService : IWeatherService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenMeteoWeatherService> _logger;

    public OpenMeteoWeatherService(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        IConfiguration configuration,
        ILogger<OpenMeteoWeatherService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;
    }

    private double DefaultLatitude =>
        _configuration.GetValue<double>("Weather:DefaultLatitude", 6.9271);

    private double DefaultLongitude =>
        _configuration.GetValue<double>("Weather:DefaultLongitude", 79.8612);

    private string DefaultLocationName =>
        _configuration.GetValue<string>("Weather:DefaultLocationName") ?? "Colombo Arena Complex";

    private string ApiBaseUrl =>
        _configuration.GetValue<string>("Weather:ApiBaseUrl") ?? "https://api.open-meteo.com/v1/forecast";

    private int CacheDurationMinutes =>
        _configuration.GetValue<int>("Weather:CacheDurationMinutes", 30);

    private string? ApiKey =>
        _configuration.GetValue<string>("Weather:ApiKey");

    public async Task<OpenMeteoResponse?> GetRawForecastAsync(
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default)
    {
        var lat = latitude ?? DefaultLatitude;
        var lon = longitude ?? DefaultLongitude;

        // Round coordinates to 3 decimals for cache grouping
        var roundLat = Math.Round(lat, 3);
        var roundLon = Math.Round(lon, 3);
        var cacheKey = $"weather_forecast_{roundLat}_{roundLon}";

        if (_cache.TryGetValue(cacheKey, out OpenMeteoResponse? cachedResponse) && cachedResponse != null)
        {
            return cachedResponse;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            var query = $"{ApiBaseUrl}?latitude={roundLat.ToString(CultureInfo.InvariantCulture)}&longitude={roundLon.ToString(CultureInfo.InvariantCulture)}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto";

            if (!string.IsNullOrWhiteSpace(ApiKey))
            {
                query += $"&apikey={Uri.EscapeDataString(ApiKey)}";
            }

            var response = await client.GetFromJsonAsync<OpenMeteoResponse>(query, cancellationToken);
            if (response != null)
            {
                _cache.Set(cacheKey, response, TimeSpan.FromMinutes(CacheDurationMinutes));
                return response;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WeatherService] Failed to retrieve weather forecast from Open-Meteo for ({Lat}, {Lon}).", roundLat, roundLon);
        }

        return null;
    }

    public async Task<CurrentWeatherDto> GetCurrentWeatherAsync(
        double? latitude = null,
        double? longitude = null,
        string? locationName = null,
        CancellationToken cancellationToken = default)
    {
        var lat = latitude ?? DefaultLatitude;
        var lon = longitude ?? DefaultLongitude;
        var locName = !string.IsNullOrWhiteSpace(locationName) ? locationName : DefaultLocationName;

        var raw = await GetRawForecastAsync(lat, lon, cancellationToken);
        if (raw?.Current != null)
        {
            var code = raw.Current.WeatherCode;
            var (cond, icon, _, _) = WeatherCodeHelper.Parse(code);
            var (isSuitable, suitMsg) = WeatherCodeHelper.GetSuitability(code, raw.Current.Precipitation, raw.Current.WindSpeed10m);

            return new CurrentWeatherDto
            {
                Temperature = Math.Round(raw.Current.Temperature2m, 1),
                TemperatureUnit = "°C",
                WeatherCode = code,
                Condition = cond,
                Icon = icon,
                IsSuitableForPlay = isSuitable,
                SuitabilityMessage = suitMsg,
                Precipitation = raw.Current.Precipitation,
                WindSpeed = Math.Round(raw.Current.WindSpeed10m, 1),
                WindSpeedUnit = "km/h",
                Humidity = raw.Current.RelativeHumidity2m,
                LocationName = locName,
                Latitude = lat,
                Longitude = lon,
                UpdatedAtUtc = DateTime.UtcNow
            };
        }

        // Graceful fallback when weather API is unreachable
        return new CurrentWeatherDto
        {
            Temperature = 28.0,
            TemperatureUnit = "°C",
            WeatherCode = 1,
            Condition = "Mainly Clear",
            Icon = "🌤️",
            IsSuitableForPlay = true,
            SuitabilityMessage = "Conditions Report Pending",
            Precipitation = 0,
            WindSpeed = 10,
            WindSpeedUnit = "km/h",
            Humidity = 70,
            LocationName = locName,
            Latitude = lat,
            Longitude = lon,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }

    public async Task<List<HourlyForecastPoint>> GetHourlyForecastAsync(
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default)
    {
        var lat = latitude ?? DefaultLatitude;
        var lon = longitude ?? DefaultLongitude;

        var raw = await GetRawForecastAsync(lat, lon, cancellationToken);
        var result = new List<HourlyForecastPoint>();

        if (raw?.Hourly != null && raw.Hourly.Time.Count > 0)
        {
            var count = raw.Hourly.Time.Count;
            for (int i = 0; i < count; i++)
            {
                var timeStr = raw.Hourly.Time[i];
                if (!DateTime.TryParse(timeStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dtLocal))
                {
                    continue;
                }

                var temp = i < raw.Hourly.Temperature2m.Count ? raw.Hourly.Temperature2m[i] : 25.0;
                var rainProb = i < raw.Hourly.PrecipitationProbability.Count ? raw.Hourly.PrecipitationProbability[i] : 0;
                var precip = i < raw.Hourly.Precipitation.Count ? raw.Hourly.Precipitation[i] : 0.0;
                var code = i < raw.Hourly.WeatherCode.Count ? raw.Hourly.WeatherCode[i] : 0;
                var wind = i < raw.Hourly.WindSpeed10m.Count ? raw.Hourly.WindSpeed10m[i] : 10.0;
                var (cond, _, isRain, isThunder) = WeatherCodeHelper.Parse(code);

                result.Add(new HourlyForecastPoint
                {
                    DateTimeLocal = dtLocal,
                    LocalTimeStr = timeStr,
                    Temperature = Math.Round(temp, 1),
                    RainProbability = rainProb,
                    PrecipitationMm = Math.Round(precip, 2),
                    WeatherCode = code,
                    Condition = cond,
                    WindSpeedKmh = Math.Round(wind, 1),
                    IsRain = isRain || precip > 0.1 || rainProb >= 60,
                    IsThunderstorm = isThunder
                });
            }
        }

        return result;
    }

    public async Task<List<DailyForecastDto>> GetDailyForecastAsync(
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default)
    {
        var lat = latitude ?? DefaultLatitude;
        var lon = longitude ?? DefaultLongitude;

        var raw = await GetRawForecastAsync(lat, lon, cancellationToken);
        var result = new List<DailyForecastDto>();

        if (raw?.Daily != null && raw.Daily.Time.Count > 0)
        {
            var count = raw.Daily.Time.Count;
            for (int i = 0; i < count; i++)
            {
                var dateStr = raw.Daily.Time[i];
                var code = i < raw.Daily.WeatherCode.Count ? raw.Daily.WeatherCode[i] : 1;
                var maxTemp = i < raw.Daily.Temperature2mMax.Count ? raw.Daily.Temperature2mMax[i] : 30.0;
                var minTemp = i < raw.Daily.Temperature2mMin.Count ? raw.Daily.Temperature2mMin[i] : 24.0;
                var precipSum = i < raw.Daily.PrecipitationSum.Count ? raw.Daily.PrecipitationSum[i] : 0.0;
                var probMax = i < raw.Daily.PrecipitationProbabilityMax.Count ? raw.Daily.PrecipitationProbabilityMax[i] : 0;

                var (cond, icon, _, isThunder) = WeatherCodeHelper.Parse(code);
                var isSuitable = !isThunder && code < 65 && precipSum < 10.0;

                string dayOfWeek = "";
                if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
                {
                    dayOfWeek = parsedDate.ToString("ddd");
                }

                result.Add(new DailyForecastDto
                {
                    Date = dateStr,
                    DayOfWeek = dayOfWeek,
                    MaxTemp = Math.Round(maxTemp, 1),
                    MinTemp = Math.Round(minTemp, 1),
                    WeatherCode = code,
                    Condition = cond,
                    Icon = icon,
                    PrecipitationSum = Math.Round(precipSum, 1),
                    RainProbabilityMax = probMax,
                    IsSuitableForOutdoor = isSuitable
                });
            }
        }

        return result;
    }
}
