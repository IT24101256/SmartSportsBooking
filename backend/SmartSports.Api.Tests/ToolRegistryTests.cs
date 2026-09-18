using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.AI.Tools;

namespace SmartSports.Api.Tests;

public class ToolRegistryTests
{
    [Fact]
    public async Task Registry_denies_a_tool_to_an_unauthorized_agent_role()
    {
        var registry = new DefaultToolRegistry(new ITool[] { new ValidateBusinessRulesTool() });
        var result = await registry.ExecuteToolAsync(
            "validate_business_rules",
            AgentRoles.FacilityAnalyst,
            "{}",
            new AgentExecutionContext());

        Assert.False(result.Success);
        Assert.Contains("does not have permission", result.Error);
    }
}
