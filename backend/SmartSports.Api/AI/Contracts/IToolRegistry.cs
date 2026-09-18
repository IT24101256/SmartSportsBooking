using System.Diagnostics;
using System.Text.Json;

namespace SmartSportsFacilityBooking.AI.Contracts;

public interface IToolRegistry
{
    void RegisterTool(ITool tool);
    ITool? GetTool(string toolName);
    IReadOnlyList<ITool> GetToolsForAgent(string agentRole);
    Task<ToolCallRecord> ExecuteToolAsync(string toolName, string agentRole, string inputJson, AgentExecutionContext context);
}

public class DefaultToolRegistry : IToolRegistry
{
    private readonly Dictionary<string, ITool> _tools = new(StringComparer.OrdinalIgnoreCase);

    public DefaultToolRegistry(IEnumerable<ITool> tools)
    {
        foreach (var tool in tools)
        {
            RegisterTool(tool);
        }
    }

    public void RegisterTool(ITool tool)
    {
        _tools[tool.Name] = tool;
    }

    public ITool? GetTool(string toolName)
    {
        _tools.TryGetValue(toolName, out var tool);
        return tool;
    }

    public IReadOnlyList<ITool> GetToolsForAgent(string agentRole)
    {
        return _tools.Values
            .Where(t => t.AllowedAgentRoles.Contains(agentRole, StringComparer.OrdinalIgnoreCase) || t.AllowedAgentRoles.Contains("*"))
            .ToList();
    }

    public async Task<ToolCallRecord> ExecuteToolAsync(string toolName, string agentRole, string inputJson, AgentExecutionContext context)
    {
        var record = new ToolCallRecord
        {
            ToolName = toolName,
            InputJson = string.IsNullOrWhiteSpace(inputJson) ? "{}" : inputJson
        };

        if (!_tools.TryGetValue(toolName, out var tool))
        {
            record.Success = false;
            record.Error = $"Tool '{toolName}' is not registered in the allow-list.";
            record.OutputJson = JsonSerializer.Serialize(new { error = record.Error });
            return record;
        }

        // Least-privilege role permission check
        if (!tool.AllowedAgentRoles.Contains(agentRole, StringComparer.OrdinalIgnoreCase) && !tool.AllowedAgentRoles.Contains("*"))
        {
            record.Success = false;
            record.Error = $"Agent '{agentRole}' does not have permission to execute tool '{toolName}'.";
            record.OutputJson = JsonSerializer.Serialize(new { error = record.Error });
            return record;
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var result = await tool.ExecuteAsync(inputJson, context);
            sw.Stop();
            record.ExecutionTimeMs = sw.ElapsedMilliseconds;
            record.Success = result.Success;
            record.Error = result.ErrorMessage;
            record.OutputJson = result.Data != null ? JsonSerializer.Serialize(result.Data) : JsonSerializer.Serialize(new { success = result.Success });
        }
        catch (Exception ex)
        {
            sw.Stop();
            record.ExecutionTimeMs = sw.ElapsedMilliseconds;
            record.Success = false;
            record.Error = ex.Message;
            record.OutputJson = JsonSerializer.Serialize(new { error = ex.Message });
        }

        context.WorkflowToolCalls.Add(record);
        return record;
    }
}
