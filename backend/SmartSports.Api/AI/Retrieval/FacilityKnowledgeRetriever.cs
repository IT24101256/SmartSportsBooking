namespace SmartSportsFacilityBooking.AI.Retrieval;

public sealed record FacilityKnowledgeSource
{
    public string SourceId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public int FacilityId { get; init; }
    public int ChunkIndex { get; init; }
    public string Content { get; init; } = string.Empty;
    public double RelevanceScore { get; init; }
}

/// <summary>
/// Adapter connecting the specialized FacilityAnalysisAgent to the full 4-Block Agentic RAG subsystem.
/// </summary>
public sealed class FacilityKnowledgeRetriever
{
    private readonly FacilityKnowledgeBase _knowledgeBase;

    public FacilityKnowledgeRetriever(FacilityKnowledgeBase knowledgeBase)
    {
        _knowledgeBase = knowledgeBase;
    }

    public async Task<IReadOnlyList<FacilityKnowledgeSource>> RetrieveAsync(string query, int limit = 5)
    {
        var result = await _knowledgeBase.QueryAsync(query);

        return result.Sources.Select(s => new FacilityKnowledgeSource
        {
            SourceId = s.SourceId,
            Title = s.Title,
            FacilityId = s.FacilityId ?? 0,
            ChunkIndex = s.ChunkIndex,
            Content = s.Excerpt,
            RelevanceScore = s.RelevanceScore
        }).Take(limit).ToList();
    }
}
