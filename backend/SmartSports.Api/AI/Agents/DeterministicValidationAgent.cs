using System.Diagnostics;
using System.Text.Json;
using SmartSportsFacilityBooking.AI.Contracts;

namespace SmartSportsFacilityBooking.AI.Agents;

public class DeterministicValidationAgent : IAgent
{
    private readonly IToolRegistry _toolRegistry;

    public DeterministicValidationAgent(IToolRegistry toolRegistry)
    {
        _toolRegistry = toolRegistry;
    }

    public string Name => "Deterministic Validation Engine";
    public string Role => AgentRoles.ValidationEngine;
    public string Responsibility => "Executes deterministic business rule evaluation, schedule conflict detection, and safety boundary enforcement.";
    public IReadOnlyList<string> AllowedTools => new[] { "check_schedule_conflict", "validate_business_rules" };

    public async Task<AgentResult> ExecuteStepAsync(AgentExecutionContext context)
    {
        var sw = Stopwatch.StartNew();
        var toolCalls = new List<ToolCallRecord>();

        var proposalInfo = context.GetMemory<FacilityProposalInfo>("FacilityProposalInfo");
        var facilityId = proposalInfo?.FacilityId ?? 0;
        var estimatedCost = proposalInfo?.EstimatedCost ?? 1500m;

        // Step 1: Call allow-listed tool `check_schedule_conflict`
        var conflictInput = JsonSerializer.Serialize(new
        {
            FacilityId = facilityId,
            RequestedStart = context.RequestedStart,
            RequestedEnd = context.RequestedEnd
        });
        var conflictRecord = await _toolRegistry.ExecuteToolAsync("check_schedule_conflict", Role, conflictInput, context);
        toolCalls.Add(conflictRecord);

        bool slotAvailable = false;
        if (conflictRecord.Success)
        {
            using var doc = JsonDocument.Parse(conflictRecord.OutputJson);
            if (doc.RootElement.TryGetProperty("available", out var availProp))
            {
                slotAvailable = availProp.GetBoolean();
            }
            else if (doc.RootElement.TryGetProperty("Available", out var availPropUpper))
            {
                slotAvailable = availPropUpper.GetBoolean();
            }
        }

        // Step 2: Call allow-listed tool `validate_business_rules`
        var rulesInput = JsonSerializer.Serialize(new
        {
            FacilityId = facilityId > 0 ? (int?)facilityId : null,
            RequestedStart = context.RequestedStart,
            RequestedEnd = context.RequestedEnd,
            Guests = context.Guests,
            Budget = context.Budget,
            EstimatedCost = estimatedCost
        });
        var rulesRecord = await _toolRegistry.ExecuteToolAsync("validate_business_rules", Role, rulesInput, context);
        toolCalls.Add(rulesRecord);

        var matrix = JsonSerializer.Deserialize<DeterministicValidationMatrix>(rulesRecord.OutputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new DeterministicValidationMatrix();

        matrix.SlotAvailable = slotAvailable;
        if (slotAvailable)
        {
            matrix.PassedRules.Add("No scheduling collisions detected with existing bookings.");
        }
        else
        {
            matrix.Violations.Add("Facility has overlapping reservations during the requested timeframe.");
        }

        context.SetMemory("ValidationMatrix", matrix);
        sw.Stop();

        if (matrix.AllPassed)
        {
            return AgentResult.Succeeded(
                $"Deterministic validation passed: {matrix.PassedRules.Count} rules verified, 0 violations.",
                matrix,
                toolCalls,
                sw.ElapsedMilliseconds
            );
        }

        return AgentResult.Failed(
            $"Validation failed with {matrix.Violations.Count} violation(s): {string.Join("; ", matrix.Violations)}",
            toolCalls,
            sw.ElapsedMilliseconds
        );
    }
}
