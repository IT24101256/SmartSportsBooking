using System.Text.Json;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.AI.Retrieval;

namespace SmartSportsFacilityBooking.AI.Tools;

public sealed class RetrieveFacilityKnowledgeInput
{
    public string Query { get; set; } = string.Empty;
}

public sealed class RetrieveFacilityKnowledgeTool : ITool
{
    private readonly FacilityKnowledgeRetriever _retriever;

    public RetrieveFacilityKnowledgeTool(FacilityKnowledgeRetriever retriever)
    {
        _retriever = retriever;
    }

    public string Name => "retrieve_facility_knowledge";
    public string Description => "Retrieves grounded facility catalog passages with source metadata for the booking recommendation.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.FacilityAnalyst };

    public async Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<RetrieveFacilityKnowledgeInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new RetrieveFacilityKnowledgeInput();
        if (string.IsNullOrWhiteSpace(input.Query)) return ToolResult.Fail("A facility knowledge query is required.");

        var sources = await _retriever.RetrieveAsync(input.Query);
        return ToolResult.Ok(sources);
    }
}
