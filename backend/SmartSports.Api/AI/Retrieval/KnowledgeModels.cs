namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// Common Document format taught in SE3090 Lecture 06 (Slide 7):
/// "A document contains: content (The actual text.) + metadata (source, page, url, author, date...).
/// Design point: Always keep the content and its metadata together. You can't cite a source you threw away."
/// </summary>
public sealed class KnowledgeDocument
{
    public string Id { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int? FacilityId { get; set; }
    public string FacilityType { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // FacilityCatalog, CancellationPolicy, PricingRule, EquipmentFaq, OperatingHours
    public string Author { get; set; } = "SmartSports Facilities Team";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string Content { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
}

/// <summary>
/// Document Chunk resulting from Step 2 (Splitting/Chunking, Slides 8-10, 35).
/// Includes contextual chunk headers to keep context intact for the embedding model.
/// </summary>
public sealed class DocumentChunk
{
    public string ChunkId { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int? FacilityId { get; set; }
    public string FacilityType { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public string Header { get; set; } = string.Empty; // Contextual chunk header (Slide 35)
    public string RawText { get; set; } = string.Empty;
    public string ContentWithHeader => string.IsNullOrWhiteSpace(Header) ? RawText : $"{Header}\n{RawText}";
    public float[] Embedding { get; set; } = Array.Empty<float>();
    public int CharacterCount => ContentWithHeader.Length;
}

/// <summary>
/// Grounding citation returned with verifiable metadata (Slide 25).
/// Allows users and auditors to trace information back to its source.
/// </summary>
public sealed class GroundedCitation
{
    public string SourceId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int? FacilityId { get; set; }
    public string Category { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public double RelevanceScore { get; set; }
    public string Excerpt { get; set; } = string.Empty;
    public string ReferenceTag => $"[{Title}, {Category}]";
}

/// <summary>
/// Intermediate candidate during hybrid retrieval & Reciprocal Rank Fusion (Slide 32-34).
/// </summary>
public sealed class HybridRetrievalCandidate
{
    public DocumentChunk Chunk { get; set; } = null!;
    public float DenseScore { get; set; }
    public int DenseRank { get; set; }
    public float BM25Score { get; set; }
    public int BM25Rank { get; set; }
    public double RrfScore { get; set; }
    public double MmrScore { get; set; }
    public double FinalScore { get; set; }
}

/// <summary>
/// End-to-end RAG Evaluation Triad (Slide 37):
/// - Context Relevance: Does retrieved context contain useful information for answering?
/// - Faithfulness: Is every statement in the answer supported by retrieved context?
/// - Answer Relevance: Does the final answer directly address what the user asked?
/// </summary>
public sealed class RagTriadScore
{
    public double ContextRelevance { get; set; } // 0.0 - 1.0
    public double Faithfulness { get; set; }      // 0.0 - 1.0
    public double AnswerRelevance { get; set; }   // 0.0 - 1.0
    public double OverallQuality => (ContextRelevance + Faithfulness + AnswerRelevance) / 3.0;
    public string Assessment { get; set; } = string.Empty;
}

/// <summary>
/// Structured Output returned by the RAG Query / Chat pipeline (Slide 25):
/// answer + sources + confidence
/// </summary>
public sealed class RagAnswerResult
{
    public string Query { get; set; } = string.Empty;
    public string RewrittenQuery { get; set; } = string.Empty;
    public string IntentRoute { get; set; } = string.Empty; // SkipRetrieval, KnowledgeRetrieval, LiveToolExecution, HybridAgentic
    public string Answer { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public bool GuardrailTriggered { get; set; }
    public List<GroundedCitation> Sources { get; set; } = new();
    public RagTriadScore Triad { get; set; } = new();
    public PipelineDiagnostics Diagnostics { get; set; } = new();
}

public sealed class PipelineDiagnostics
{
    public long IngestionDocCount { get; set; }
    public long IngestionChunkCount { get; set; }
    public int CandidatePoolCount { get; set; }
    public int SelectedChunkCount { get; set; }
    public double HighestRrfScore { get; set; }
    public long RetrievalDurationMs { get; set; }
    public long TotalDurationMs { get; set; }
    public List<string> QueryExpansions { get; set; } = new();
    public List<HybridCandidateSummary> TopCandidates { get; set; } = new();
}

public sealed class HybridCandidateSummary
{
    public string ChunkId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public float DenseScore { get; set; }
    public float BM25Score { get; set; }
    public double RrfScore { get; set; }
    public double MmrScore { get; set; }
}
