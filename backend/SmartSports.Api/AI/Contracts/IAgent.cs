namespace SmartSportsFacilityBooking.AI.Contracts;

public interface IAgent
{
    string Name { get; }
    string Role { get; }
    string Responsibility { get; }
    IReadOnlyList<string> AllowedTools { get; }
    Task<AgentResult> ExecuteStepAsync(AgentExecutionContext context);
}
