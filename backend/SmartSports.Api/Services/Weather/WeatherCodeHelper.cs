namespace SmartSportsFacilityBooking.Services.Weather;

public static class WeatherCodeHelper
{
    public static (string Condition, string Icon, bool IsRain, bool IsThunderstorm) Parse(int code)
    {
        return code switch
        {
            0 => ("Clear Sky", "☀️", false, false),
            1 => ("Mainly Clear", "🌤️", false, false),
            2 => ("Partly Cloudy", "⛅", false, false),
            3 => ("Overcast", "☁️", false, false),
            45 => ("Foggy", "🌫️", false, false),
            48 => ("Depositing Rime Fog", "🌫️", false, false),
            51 => ("Light Drizzle", "🌦️", true, false),
            53 => ("Moderate Drizzle", "🌦️", true, false),
            55 => ("Dense Drizzle", "🌦️", true, false),
            56 or 57 => ("Freezing Drizzle", "❄️", true, false),
            61 => ("Slight Rain", "🌦️", true, false),
            63 => ("Moderate Rain", "🌧️", true, false),
            65 => ("Heavy Rain", "🌧️", true, false),
            66 or 67 => ("Freezing Rain", "🌧️", true, false),
            71 => ("Slight Snow", "🌨️", true, false),
            73 => ("Moderate Snow", "🌨️", true, false),
            75 => ("Heavy Snow", "🌨️", true, false),
            77 => ("Snow Grains", "🌨️", true, false),
            80 => ("Slight Rain Showers", "🌦️", true, false),
            81 => ("Moderate Rain Showers", "🌧️", true, false),
            82 => ("Violent Rain Showers", "🌧️", true, false),
            85 or 86 => ("Snow Showers", "🌨️", true, false),
            95 => ("Thunderstorm", "⛈️", true, true),
            96 or 99 => ("Severe Thunderstorm with Hail", "⛈️", true, true),
            _ => ("Variable Weather", "🌤️", false, false)
        };
    }

    public static (bool IsSuitable, string Message) GetSuitability(int code, double precipitation, double windSpeed)
    {
        var (_, _, isRain, isThunderstorm) = Parse(code);

        if (isThunderstorm || code >= 95)
        {
            return (false, "Not Suitable for Outdoor Play");
        }

        if (code == 65 || code == 82 || precipitation >= 5.0 || windSpeed >= 50.0)
        {
            return (false, "Heavy Weather • Not Suitable");
        }

        if (isRain || precipitation > 0.5)
        {
            return (false, "Rainy Conditions");
        }

        return (true, "Good Conditions for Play");
    }
}
