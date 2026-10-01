namespace SmartSportsFacilityBooking.AI.Models;

public class KnowledgeChunk
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Source { get; set; } = "MySpot Knowledge Base";
    public string Content { get; set; } = string.Empty;
    public string Citation { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = new();
    public float[]? Embedding { get; set; }
}

public class RetrievalResult
{
    public KnowledgeChunk Chunk { get; set; } = new();
    public double Score { get; set; }
    public double VectorScore { get; set; }
    public double KeywordScore { get; set; }
    public bool IsRelevant { get; set; }
}
