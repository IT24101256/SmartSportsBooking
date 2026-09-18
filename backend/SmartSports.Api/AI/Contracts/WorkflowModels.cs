using System.Text.Json;

namespace SmartSportsFacilityBooking.AI.Contracts;

public static class AgentRoles
{
    public const string Coordinator = "Planning & Coordination Agent";
    public const string FacilityAnalyst = "Domain & Facility Analysis Agent";
    public const string ValidationEngine = "Scheduling & Deterministic Validation Agent";
    public const string ActionExecutor = "Inventory & Action Execution Agent";
}

public class ToolCallRecord
{
    public string ToolName { get; set; } = string.Empty;
    public string InputJson { get; set; } = "{}";
    public string OutputJson { get; set; } = "{}";
    public bool Success { get; set; } = true;
    public long ExecutionTimeMs { get; set; }
    public string? Error { get; set; }
}

public class AgentResult
{
    public bool Success { get; set; } = true;
    public string Summary { get; set; } = string.Empty;
    public object? OutputData { get; set; }
    public string OutputJson => OutputData != null ? JsonSerializer.Serialize(OutputData) : "{}";
    public List<ToolCallRecord> ToolCalls { get; set; } = new();
    public string? ErrorMessage { get; set; }
    public long ExecutionTimeMs { get; set; }

    public static AgentResult Succeeded(string summary, object? outputData, List<ToolCallRecord>? toolCalls = null, long durationMs = 0) =>
        new()
        {
            Success = true,
            Summary = summary,
            OutputData = outputData,
            ToolCalls = toolCalls ?? new List<ToolCallRecord>(),
            ExecutionTimeMs = durationMs
        };

    public static AgentResult Failed(string errorMessage, List<ToolCallRecord>? toolCalls = null, long durationMs = 0) =>
        new()
        {
            Success = false,
            ErrorMessage = errorMessage,
            ToolCalls = toolCalls ?? new List<ToolCallRecord>(),
            ExecutionTimeMs = durationMs
        };
}

public class AgentExecutionContext
{
    public Guid WorkflowId { get; set; }
    public int CustomerId { get; set; }
    public string Objective { get; set; } = string.Empty;
    public string FacilityType { get; set; } = string.Empty;
    public DateTime RequestedStart { get; set; }
    public DateTime RequestedEnd { get; set; }
    public int Guests { get; set; }
    public decimal Budget { get; set; }
    public Dictionary<string, object> SharedMemory { get; set; } = new();
    public List<ToolCallRecord> WorkflowToolCalls { get; set; } = new();

    public T? GetMemory<T>(string key)
    {
        if (!SharedMemory.TryGetValue(key, out var val)) return default;
        if (val is T typed) return typed;
        if (val is JsonElement jsonElement)
        {
            return JsonSerializer.Deserialize<T>(jsonElement.GetRawText());
        }
        var serialized = JsonSerializer.Serialize(val);
        return JsonSerializer.Deserialize<T>(serialized);
    }

    public void SetMemory(string key, object value)
    {
        SharedMemory[key] = value;
    }
}

public class PlannedStep
{
    public int StepIndex { get; set; }
    public string AgentRole { get; set; } = string.Empty;
    public string StepName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> ExpectedTools { get; set; } = new();
    public List<int> DependsOnSteps { get; set; } = new();
}

public class StructuredWorkflowPlan
{
    public string PlanId { get; set; } = Guid.NewGuid().ToString("N");
    public string Objective { get; set; } = string.Empty;
    public string Strategy { get; set; } = string.Empty;
    public List<PlannedStep> Steps { get; set; } = new();
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
}

public class FacilityProposalInfo
{
    public int? FacilityId { get; set; }
    public string? FacilityName { get; set; }
    public string FacilityType { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal HourlyRate { get; set; }
    public decimal EstimatedCost { get; set; }
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public int Guests { get; set; }
    public List<string> Amenities { get; set; } = new();
    public string MatchRationale { get; set; } = string.Empty;
}

public class DeterministicValidationMatrix
{
    public bool FacilityExists { get; set; }
    public bool SlotAvailable { get; set; }
    public bool ValidDates { get; set; }
    public bool WithinBudget { get; set; }
    public bool GuestsWithinLimit { get; set; }
    public bool OperatingHoursCompliant { get; set; }
    public bool AdvanceNoticeValid { get; set; }
    public List<string> PassedRules { get; set; } = new();
    public List<string> Violations { get; set; } = new();
    public bool AllPassed => FacilityExists && SlotAvailable && ValidDates && WithinBudget && GuestsWithinLimit && OperatingHoursCompliant && AdvanceNoticeValid;
}
