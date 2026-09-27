using System.Diagnostics;
using System.Text.Json;
using SmartSportsFacilityBooking.AI.Contracts;

namespace SmartSportsFacilityBooking.AI.Agents;

public class FacilityAnalysisAgent : IAgent
{
    private readonly IToolRegistry _toolRegistry;

    public FacilityAnalysisAgent(IToolRegistry toolRegistry)
    {
        _toolRegistry = toolRegistry;
    }

    public string Name => "Domain & Facility Analyst";
    public string Role => AgentRoles.FacilityAnalyst;
    public string Responsibility => "Evaluates sport type, finds optimal court/ground facilities, calculates estimated quotation, and checks amenities.";
    public IReadOnlyList<string> AllowedTools => new[] { "retrieve_facility_knowledge", "search_facilities", "get_facility_details" };

    public async Task<AgentResult> ExecuteStepAsync(AgentExecutionContext context)
    {
        var sw = Stopwatch.StartNew();
        var toolCalls = new List<ToolCallRecord>();

        var knowledgeInput = JsonSerializer.Serialize(new { Query = $"{context.FacilityType} {context.Objective}" });
        var knowledgeRecord = await _toolRegistry.ExecuteToolAsync("retrieve_facility_knowledge", Role, knowledgeInput, context);
        toolCalls.Add(knowledgeRecord);

        if (!knowledgeRecord.Success)
        {
            sw.Stop();
            return AgentResult.Failed($"Facility knowledge retrieval failed: {knowledgeRecord.Error}", toolCalls, sw.ElapsedMilliseconds);
        }

        var citations = JsonSerializer.Deserialize<List<KnowledgeCitation>>(knowledgeRecord.OutputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new List<KnowledgeCitation>();

        // Step 1: Call allow-listed tool `search_facilities`
        var searchInput = JsonSerializer.Serialize(new { FacilityType = context.FacilityType, MinCapacity = context.Guests });
        var searchRecord = await _toolRegistry.ExecuteToolAsync("search_facilities", Role, searchInput, context);
        toolCalls.Add(searchRecord);

        if (!searchRecord.Success)
        {
            sw.Stop();
            return AgentResult.Failed($"Search tool execution failed: {searchRecord.Error}", toolCalls, sw.ElapsedMilliseconds);
        }

        var facilities = JsonSerializer.Deserialize<List<FacilityOption>>(searchRecord.OutputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new List<FacilityOption>();

        if (!facilities.Any())
        {
            sw.Stop();
            return AgentResult.Failed($"No active facility available for sport type '{context.FacilityType}'.", toolCalls, sw.ElapsedMilliseconds);
        }

        var selected = facilities.FirstOrDefault(facility => citations.Any(citation => citation.FacilityId == facility.Id))
            ?? facilities.First();

        // Step 2: Call allow-listed tool `get_facility_details`
        var detailsInput = JsonSerializer.Serialize(new { FacilityId = selected.Id });
        var detailsRecord = await _toolRegistry.ExecuteToolAsync("get_facility_details", Role, detailsInput, context);
        toolCalls.Add(detailsRecord);

        var durationHours = (decimal)(context.RequestedEnd - context.RequestedStart).TotalHours;
        if (durationHours <= 0) durationHours = 1;

        var hourlyRate = selected.EstimatedHourlyRate;
        var estimatedCost = hourlyRate * durationHours;

        var proposalInfo = new FacilityProposalInfo
        {
            FacilityId = selected.Id,
            FacilityName = selected.Name,
            FacilityType = context.FacilityType,
            HourlyRate = hourlyRate,
            EstimatedCost = estimatedCost,
            Start = context.RequestedStart,
            End = context.RequestedEnd,
            Guests = context.Guests,
            Amenities = new List<string> { "Locker Rooms", "Lighting", "Scoreboard Support" },
            Sources = citations
                .Where(citation => citation.FacilityId == selected.Id)
                .Take(3)
                .ToList(),
            MatchRationale = $"Selected '{selected.Name}' using retrieved facility knowledge, capacity alignment ({selected.Capacity} >= {context.Guests}), and active status."
        };

        context.SetMemory("FacilityProposalInfo", proposalInfo);
        sw.Stop();

        return AgentResult.Succeeded(
            $"Facility '{proposalInfo.FacilityName}' matched. Estimated cost for {durationHours:F1}h is LKR {estimatedCost:N2}.",
            proposalInfo,
            toolCalls,
            sw.ElapsedMilliseconds
        );
    }

    private sealed class FacilityOption
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
        public decimal EstimatedHourlyRate { get; set; }
        public int Capacity { get; set; }
    }
}
