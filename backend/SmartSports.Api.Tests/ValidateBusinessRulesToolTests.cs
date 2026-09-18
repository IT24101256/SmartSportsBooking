using System.Text.Json;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.AI.Tools;

namespace SmartSports.Api.Tests;

public class ValidateBusinessRulesToolTests
{
    [Fact]
    public async Task Valid_request_passes_all_business_rules()
    {
        var tool = new ValidateBusinessRulesTool();
        var start = DateTime.UtcNow.Date.AddDays(1).AddHours(10);
        var input = JsonSerializer.Serialize(new
        {
            FacilityId = 1,
            RequestedStart = start,
            RequestedEnd = start.AddHours(2),
            Guests = 10,
            Budget = 5000m,
            EstimatedCost = 4000m
        });

        var result = await tool.ExecuteAsync(input, CreateContext(start));
        var matrix = Assert.IsType<DeterministicValidationMatrix>(result.Data);

        Assert.True(result.Success);
        Assert.True(matrix.FacilityExists);
        Assert.True(matrix.ValidDates);
        Assert.True(matrix.AdvanceNoticeValid);
        Assert.True(matrix.OperatingHoursCompliant);
        Assert.True(matrix.GuestsWithinLimit);
        Assert.True(matrix.WithinBudget);
        Assert.Empty(matrix.Violations);
    }

    [Fact]
    public async Task Invalid_request_reports_multiple_deterministic_violations()
    {
        var tool = new ValidateBusinessRulesTool();
        var start = DateTime.UtcNow.Date.AddDays(1).AddHours(23);
        var input = JsonSerializer.Serialize(new
        {
            FacilityId = 0,
            RequestedStart = start,
            RequestedEnd = start.AddMinutes(15),
            Guests = 31,
            Budget = 1000m,
            EstimatedCost = 1500m
        });

        var result = await tool.ExecuteAsync(input, CreateContext(start));
        var matrix = Assert.IsType<DeterministicValidationMatrix>(result.Data);

        Assert.True(result.Success);
        Assert.False(matrix.AllPassed);
        Assert.Contains(matrix.Violations, violation => violation.Contains("facility", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(matrix.Violations, violation => violation.Contains("30", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(matrix.Violations, violation => violation.Contains("budget", StringComparison.OrdinalIgnoreCase));
    }

    private static AgentExecutionContext CreateContext(DateTime start) => new()
    {
        RequestedStart = start,
        RequestedEnd = start.AddHours(1),
        Guests = 1,
        Budget = 1000m
    };
}
