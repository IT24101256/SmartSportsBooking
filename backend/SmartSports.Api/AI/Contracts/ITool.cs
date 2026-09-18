namespace SmartSportsFacilityBooking.AI.Contracts;

public class ToolResult
{
    public bool Success { get; set; } = true;
    public object? Data { get; set; }
    public string? ErrorMessage { get; set; }

    public static ToolResult Ok(object? data) => new() { Success = true, Data = data };
    public static ToolResult Fail(string error) => new() { Success = false, ErrorMessage = error };
}

public interface ITool
{
    string Name { get; }
    string Description { get; }
    IReadOnlyList<string> AllowedAgentRoles { get; }
    Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context);
}
