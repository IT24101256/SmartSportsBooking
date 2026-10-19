using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Weather;
using SmartSportsFacilityBooking.Models;
using SmartSportsFacilityBooking.Services.Weather;
using Xunit;

namespace SmartSports.Api.Tests;

public class WeatherMonitoringAgentTests
{
    private class FakeWeatherService : IWeatherService
    {
        public List<HourlyForecastPoint> HourlyForecastToReturn { get; set; } = new();

        public Task<CurrentWeatherDto> GetCurrentWeatherAsync(double? latitude = null, double? longitude = null, string? locationName = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new CurrentWeatherDto { Temperature = 28.0 });
        }

        public Task<List<DailyForecastDto>> GetDailyForecastAsync(double? latitude = null, double? longitude = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new List<DailyForecastDto>());
        }

        public Task<List<HourlyForecastPoint>> GetHourlyForecastAsync(double? latitude = null, double? longitude = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(HourlyForecastToReturn);
        }

        public Task<OpenMeteoResponse?> GetRawForecastAsync(double? latitude = null, double? longitude = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<OpenMeteoResponse?>(null);
        }
    }

    private static DbContextOptions<AppDbContext> CreateInMemoryDbOptions(string dbName)
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
    }

    [Fact]
    public void WeatherCodeHelper_CorrectlyIdentifiesThunderstormAndRain()
    {
        var (thunderCond, _, isRain, isThunder) = WeatherCodeHelper.Parse(95);
        Assert.Equal("Thunderstorm", thunderCond);
        Assert.True(isThunder);
        Assert.True(isRain);

        var (clearCond, _, clearRain, clearThunder) = WeatherCodeHelper.Parse(0);
        Assert.Equal("Clear Sky", clearCond);
        Assert.False(clearRain);
        Assert.False(clearThunder);

        var (heavyRainCond, _, isHeavyRain, isHeavyThunder) = WeatherCodeHelper.Parse(65);
        Assert.Equal("Heavy Rain", heavyRainCond);
        Assert.True(isHeavyRain);
        Assert.False(isHeavyThunder);
    }

    [Fact]
    public void WeatherCodeHelper_GetSuitability_ReturnsExpectedSuitability()
    {
        var (suitable, msg) = WeatherCodeHelper.GetSuitability(0, 0.0, 10.0);
        Assert.True(suitable);
        Assert.Equal("Good Conditions for Play", msg);

        var (thunderSuitable, thunderMsg) = WeatherCodeHelper.GetSuitability(95, 2.0, 30.0);
        Assert.False(thunderSuitable);
        Assert.Equal("Not Suitable for Outdoor Play", thunderMsg);

        var (rainSuitable, rainMsg) = WeatherCodeHelper.GetSuitability(63, 3.5, 15.0);
        Assert.False(rainSuitable);
        Assert.Equal("Rainy Conditions", rainMsg);
    }

    [Fact]
    public async Task EvaluateWeatherRisks_OutdoorFootballDuringThunderstorm_GeneratesHighRiskAlert()
    {
        var dbName = Guid.NewGuid().ToString();
        var options = CreateInMemoryDbOptions(dbName);

        using (var db = new AppDbContext(options))
        {
            var fac = new Facility
            {
                Id = 1,
                Name = "Main Football Turf",
                SportCategory = "Football",
                CourtType = "Outdoor",
                HourlyRate = 2500m
            };
            db.Facilities.Add(fac);

            var tomorrow = DateTime.UtcNow.Date.AddDays(1);
            db.Bookings.Add(new Booking
            {
                Id = 101,
                FacilityId = 1,
                Facility = fac,
                CustomerName = "Nimal Silva",
                ContactNumber = "0771234567",
                BookingDate = tomorrow,
                StartTime = new TimeSpan(16, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                HoursNeeded = 2,
                TotalAmount = 5000m,
                Status = "Confirmed"
            });
            await db.SaveChangesAsync();
        }

        var tomorrowLocal = DateTime.UtcNow.Date.AddDays(1);
        var fakeWeatherService = new FakeWeatherService
        {
            HourlyForecastToReturn = new List<HourlyForecastPoint>
            {
                new()
                {
                    DateTimeLocal = tomorrowLocal.AddHours(16),
                    WeatherCode = 95,
                    Condition = "Thunderstorm",
                    PrecipitationMm = 8.5,
                    RainProbability = 90,
                    WindSpeedKmh = 35.0,
                    IsRain = true,
                    IsThunderstorm = true
                },
                new()
                {
                    DateTimeLocal = tomorrowLocal.AddHours(17),
                    WeatherCode = 65,
                    Condition = "Heavy Rain",
                    PrecipitationMm = 6.0,
                    RainProbability = 85,
                    WindSpeedKmh = 30.0,
                    IsRain = true,
                    IsThunderstorm = false
                }
            }
        };

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts => opts.UseInMemoryDatabase(dbName));
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["WeatherAgent:ForecastWindowDays"] = "7",
            ["WeatherAgent:RainProbabilityThreshold"] = "60"
        }).Build();

        var agent = new WeatherMonitoringAgent(
            scopeFactory,
            fakeWeatherService,
            config,
            NullLogger<WeatherMonitoringAgent>.Instance
        );

        var alerts = await agent.EvaluateWeatherRisksAsync();

        Assert.Single(alerts);
        var alert = alerts.First();
        Assert.Equal(101, alert.BookingId);
        Assert.Equal("High", alert.RiskSeverity);
        Assert.Equal("Outdoor", alert.CourtType);
        Assert.Contains("Thunderstorm", alert.WarningReason);
        Assert.Equal("Unresolved", alert.AlertStatus);
    }

    [Fact]
    public async Task EvaluateWeatherRisks_IndoorBadmintonDuringRain_GeneratesNoWeatherAlert()
    {
        var dbName = Guid.NewGuid().ToString();
        var options = CreateInMemoryDbOptions(dbName);

        using (var db = new AppDbContext(options))
        {
            var fac = new Facility
            {
                Id = 2,
                Name = "Badminton Court 1",
                SportCategory = "Badminton",
                CourtType = "Indoor",
                HourlyRate = 1800m
            };
            db.Facilities.Add(fac);

            var tomorrow = DateTime.UtcNow.Date.AddDays(1);
            db.Bookings.Add(new Booking
            {
                Id = 102,
                FacilityId = 2,
                Facility = fac,
                CustomerName = "Kamal Perera",
                BookingDate = tomorrow,
                StartTime = new TimeSpan(17, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                HoursNeeded = 1,
                TotalAmount = 1800m,
                Status = "Confirmed"
            });
            await db.SaveChangesAsync();
        }

        var tomorrowLocal = DateTime.UtcNow.Date.AddDays(1);
        var fakeWeatherService = new FakeWeatherService
        {
            HourlyForecastToReturn = new List<HourlyForecastPoint>
            {
                new()
                {
                    DateTimeLocal = tomorrowLocal.AddHours(17),
                    WeatherCode = 63,
                    Condition = "Moderate Rain",
                    PrecipitationMm = 3.5,
                    RainProbability = 80,
                    WindSpeedKmh = 18.0,
                    IsRain = true,
                    IsThunderstorm = false
                }
            }
        };

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts => opts.UseInMemoryDatabase(dbName));
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();

        var agent = new WeatherMonitoringAgent(
            scopeFactory,
            fakeWeatherService,
            config,
            NullLogger<WeatherMonitoringAgent>.Instance
        );

        var alerts = await agent.EvaluateWeatherRisksAsync();

        // Indoor bookings are immune to ordinary rain
        Assert.Empty(alerts);
    }

    [Fact]
    public async Task EvaluateWeatherRisks_OutdoorCricketDuringDrizzle_GeneratesRiskAlert()
    {
        var dbName = Guid.NewGuid().ToString();
        var options = CreateInMemoryDbOptions(dbName);

        using (var db = new AppDbContext(options))
        {
            var fac = new Facility
            {
                Id = 3,
                Name = "East Cricket Pitch",
                SportCategory = "Cricket",
                CourtType = "Outdoor",
                HourlyRate = 3500m
            };
            db.Facilities.Add(fac);

            var tomorrow = DateTime.UtcNow.Date.AddDays(1);
            db.Bookings.Add(new Booking
            {
                Id = 103,
                FacilityId = 3,
                Facility = fac,
                CustomerName = "Sunil Fernando",
                BookingDate = tomorrow,
                StartTime = new TimeSpan(14, 0, 0),
                EndTime = new TimeSpan(16, 0, 0),
                HoursNeeded = 2,
                TotalAmount = 7000m,
                Status = "Confirmed"
            });
            await db.SaveChangesAsync();
        }

        var tomorrowLocal = DateTime.UtcNow.Date.AddDays(1);
        var fakeWeatherService = new FakeWeatherService
        {
            HourlyForecastToReturn = new List<HourlyForecastPoint>
            {
                new()
                {
                    DateTimeLocal = tomorrowLocal.AddHours(14),
                    WeatherCode = 53,
                    Condition = "Moderate Drizzle",
                    PrecipitationMm = 1.0,
                    RainProbability = 55,
                    WindSpeedKmh = 14.0,
                    IsRain = true,
                    IsThunderstorm = false
                },
                new()
                {
                    DateTimeLocal = tomorrowLocal.AddHours(15),
                    WeatherCode = 51,
                    Condition = "Light Drizzle",
                    PrecipitationMm = 0.6,
                    RainProbability = 45,
                    WindSpeedKmh = 12.0,
                    IsRain = true,
                    IsThunderstorm = false
                }
            }
        };

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts => opts.UseInMemoryDatabase(dbName));
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();

        var agent = new WeatherMonitoringAgent(
            scopeFactory,
            fakeWeatherService,
            config,
            NullLogger<WeatherMonitoringAgent>.Instance
        );

        var alerts = await agent.EvaluateWeatherRisksAsync();

        Assert.Single(alerts);
        var alert = alerts.First();
        Assert.Equal(103, alert.BookingId);
        Assert.Equal("Medium", alert.RiskSeverity);
        Assert.Contains("cricket pitch", alert.WarningReason);
    }

    [Fact]
    public async Task EvaluateWeatherRisks_CancelledBookingDuringSevereWeather_IsExcluded()
    {
        var dbName = Guid.NewGuid().ToString();
        var options = CreateInMemoryDbOptions(dbName);

        using (var db = new AppDbContext(options))
        {
            var fac = new Facility
            {
                Id = 4,
                Name = "Main Football Turf",
                SportCategory = "Football",
                CourtType = "Outdoor"
            };
            db.Facilities.Add(fac);

            var tomorrow = DateTime.UtcNow.Date.AddDays(1);
            db.Bookings.Add(new Booking
            {
                Id = 104,
                FacilityId = 4,
                Facility = fac,
                CustomerName = "Cancelled Customer",
                BookingDate = tomorrow,
                StartTime = new TimeSpan(16, 0, 0),
                EndTime = new TimeSpan(17, 0, 0),
                HoursNeeded = 1,
                Status = "Cancelled" // Cancelled!
            });
            await db.SaveChangesAsync();
        }

        var tomorrowLocal = DateTime.UtcNow.Date.AddDays(1);
        var fakeWeatherService = new FakeWeatherService
        {
            HourlyForecastToReturn = new List<HourlyForecastPoint>
            {
                new()
                {
                    DateTimeLocal = tomorrowLocal.AddHours(16),
                    WeatherCode = 95,
                    Condition = "Thunderstorm",
                    PrecipitationMm = 15.0,
                    RainProbability = 95,
                    WindSpeedKmh = 40.0,
                    IsRain = true,
                    IsThunderstorm = true
                }
            }
        };

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts => opts.UseInMemoryDatabase(dbName));
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var agent = new WeatherMonitoringAgent(
            scopeFactory,
            fakeWeatherService,
            new ConfigurationBuilder().Build(),
            NullLogger<WeatherMonitoringAgent>.Instance
        );

        var alerts = await agent.EvaluateWeatherRisksAsync();

        // Cancelled bookings must NEVER generate alerts
        Assert.Empty(alerts);
    }
}
