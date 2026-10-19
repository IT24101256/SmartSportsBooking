namespace SmartSportsFacilityBooking.Services.Weather;

public class WeatherMonitoringBackgroundService : BackgroundService
{
    private readonly IWeatherMonitoringAgent _agent;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WeatherMonitoringBackgroundService> _logger;

    public WeatherMonitoringBackgroundService(
        IWeatherMonitoringAgent agent,
        IConfiguration configuration,
        ILogger<WeatherMonitoringBackgroundService> logger)
    {
        _agent = agent;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = _configuration.GetValue<bool>("WeatherAgent:Enabled", true);
        if (!enabled)
        {
            _logger.LogInformation("[WeatherMonitoringWorker] Weather monitoring background agent is disabled via configuration.");
            return;
        }

        var intervalMinutes = _configuration.GetValue<int>("WeatherAgent:CheckIntervalMinutes", 30);
        if (intervalMinutes < 5) intervalMinutes = 5;

        _logger.LogInformation("[WeatherMonitoringWorker] Weather Monitoring Agent started. Check interval: {Interval} minutes.", intervalMinutes);

        // Initial delay of 10 seconds to allow the web host and database connections to fully settle
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("[WeatherMonitoringWorker] Running automated weather risk evaluation cycle...");
                var alerts = await _agent.EvaluateWeatherRisksAsync(stoppingToken);
                _logger.LogInformation("[WeatherMonitoringWorker] Evaluation complete. Current active alerts: {Count}.", alerts.Count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WeatherMonitoringWorker] Error during weather monitoring evaluation cycle. Will retry in next interval.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("[WeatherMonitoringWorker] Weather monitoring worker stopped.");
    }
}
