using System.Text.Json.Serialization;

namespace SmartSportsFacilityBooking.Dtos.Weather;

public class OpenMeteoResponse
{
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }

    [JsonPropertyName("timezone")]
    public string Timezone { get; set; } = "UTC";

    [JsonPropertyName("current")]
    public OpenMeteoCurrent? Current { get; set; }

    [JsonPropertyName("hourly")]
    public OpenMeteoHourly? Hourly { get; set; }

    [JsonPropertyName("daily")]
    public OpenMeteoDaily? Daily { get; set; }
}

public class OpenMeteoCurrent
{
    [JsonPropertyName("time")]
    public string Time { get; set; } = string.Empty;

    [JsonPropertyName("temperature_2m")]
    public double Temperature2m { get; set; }

    [JsonPropertyName("relative_humidity_2m")]
    public int RelativeHumidity2m { get; set; }

    [JsonPropertyName("precipitation")]
    public double Precipitation { get; set; }

    [JsonPropertyName("weather_code")]
    public int WeatherCode { get; set; }

    [JsonPropertyName("wind_speed_10m")]
    public double WindSpeed10m { get; set; }
}

public class OpenMeteoHourly
{
    [JsonPropertyName("time")]
    public List<string> Time { get; set; } = new();

    [JsonPropertyName("temperature_2m")]
    public List<double> Temperature2m { get; set; } = new();

    [JsonPropertyName("precipitation_probability")]
    public List<int> PrecipitationProbability { get; set; } = new();

    [JsonPropertyName("precipitation")]
    public List<double> Precipitation { get; set; } = new();

    [JsonPropertyName("weather_code")]
    public List<int> WeatherCode { get; set; } = new();

    [JsonPropertyName("wind_speed_10m")]
    public List<double> WindSpeed10m { get; set; } = new();
}

public class OpenMeteoDaily
{
    [JsonPropertyName("time")]
    public List<string> Time { get; set; } = new();

    [JsonPropertyName("weather_code")]
    public List<int> WeatherCode { get; set; } = new();

    [JsonPropertyName("temperature_2m_max")]
    public List<double> Temperature2mMax { get; set; } = new();

    [JsonPropertyName("temperature_2m_min")]
    public List<double> Temperature2mMin { get; set; } = new();

    [JsonPropertyName("precipitation_sum")]
    public List<double> PrecipitationSum { get; set; } = new();

    [JsonPropertyName("precipitation_probability_max")]
    public List<int> PrecipitationProbabilityMax { get; set; } = new();
}

public class CurrentWeatherDto
{
    public double Temperature { get; set; }
    public string TemperatureUnit { get; set; } = "°C";
    public int WeatherCode { get; set; }
    public string Condition { get; set; } = "Clear Sky";
    public string Icon { get; set; } = "☀️";
    public bool IsSuitableForPlay { get; set; } = true;
    public string SuitabilityMessage { get; set; } = "Good Conditions for Play";
    public double Precipitation { get; set; }
    public double WindSpeed { get; set; }
    public string WindSpeedUnit { get; set; } = "km/h";
    public int Humidity { get; set; }
    public string LocationName { get; set; } = "Colombo Arena Complex";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class HourlyForecastPoint
{
    public DateTime DateTimeLocal { get; set; }
    public string LocalTimeStr { get; set; } = string.Empty;
    public double Temperature { get; set; }
    public int RainProbability { get; set; }
    public double PrecipitationMm { get; set; }
    public int WeatherCode { get; set; }
    public string Condition { get; set; } = string.Empty;
    public double WindSpeedKmh { get; set; }
    public bool IsRain { get; set; }
    public bool IsThunderstorm { get; set; }
}

public class DailyForecastDto
{
    public string Date { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = string.Empty;
    public double MaxTemp { get; set; }
    public double MinTemp { get; set; }
    public int WeatherCode { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string Icon { get; set; } = "🌤️";
    public double PrecipitationSum { get; set; }
    public int RainProbabilityMax { get; set; }
    public bool IsSuitableForOutdoor { get; set; } = true;
}

public class WeatherRiskAlertDto
{
    public int BookingId { get; set; }
    public int FacilityId { get; set; }
    public string FacilityName { get; set; } = string.Empty;
    public string CourtType { get; set; } = "Outdoor";
    public string SportCategory { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string FormattedDate { get; set; } = string.Empty;
    public string FormattedTimeSlot { get; set; } = string.Empty;
    public string ForecastCondition { get; set; } = string.Empty;
    public int WeatherCode { get; set; }
    public int RainProbability { get; set; }
    public double PrecipitationMm { get; set; }
    public double WindSpeedKmh { get; set; }
    public string RiskSeverity { get; set; } = "Medium"; // "Low", "Medium", "High"
    public string WarningReason { get; set; } = string.Empty;
    public bool IsRescheduleRequested { get; set; }
    public string? RescheduleReason { get; set; }
    public string AlertStatus { get; set; } = "Unresolved"; // "Unresolved", "RescheduleOffered"
    public DateTime EvaluatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class WeatherOverviewDto
{
    public CurrentWeatherDto Current { get; set; } = new();
    public int AlertsCount { get; set; }
    public List<WeatherRiskAlertDto> Alerts { get; set; } = new();
    public List<DailyForecastDto> DailyForecast { get; set; } = new();
    public DateTime LastEvaluatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool IsAvailable { get; set; } = true;
    public string Provider { get; set; } = "Open-Meteo";
}
