using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SmartSportsFacilityBooking.AI.Memory;
using SmartSportsFacilityBooking.AI.Retrieval;

namespace SmartSportsFacilityBooking.Controllers;

public sealed class RagChatRequest
{
    public string Query { get; set; } = string.Empty;
    public string? SessionId { get; set; }
}

public sealed class RagChatResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public string RewrittenQuery { get; set; } = string.Empty;
    public string IntentRoute { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public bool GuardrailTriggered { get; set; }
    public List<GroundedCitation> Sources { get; set; } = new();
    public RagTriadScore Triad { get; set; } = new();
    public PipelineDiagnostics Diagnostics { get; set; } = new();
    public List<UserFact> SemanticMemory { get; set; } = new();
}

[ApiController]
[Route("api/rag")]
public class RagController : ControllerBase
{
    private readonly FacilityKnowledgeBase _knowledgeBase;
    private readonly AgentMemoryStore _memoryStore;

    public RagController(FacilityKnowledgeBase knowledgeBase, AgentMemoryStore memoryStore)
    {
        _knowledgeBase = knowledgeBase;
        _memoryStore = memoryStore;
    }

    /// <summary>
    /// Conversational Agentic RAG Endpoint (SE3090 Lecture 06, Slides 6, 24-25, 31-34, 37, 45-55).
    /// Orchestrates: Session Memory -> Coreference Rewrite -> Intent Routing -> Hybrid Retrieval (Dense+BM25) -> RRF (k=60) -> MMR Diversity -> Anti-Hallucination Guardrail -> Citations + RAG Triad -> Memory Write.
    /// </summary>
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] RagChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Query))
        {
            return BadRequest(new { error = "Query string cannot be empty." });
        }

        var sessionId = string.IsNullOrWhiteSpace(request.SessionId) ? Guid.NewGuid().ToString("N") : request.SessionId;
        var userIdentifier = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "guest-user";
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Customer";

        var result = await _knowledgeBase.QueryAsync(request.Query, sessionId, userIdentifier, userRole);
        var facts = _memoryStore.GetUserFacts(userIdentifier).ToList();

        return Ok(new RagChatResponse
        {
            SessionId = sessionId,
            Query = result.Query,
            RewrittenQuery = result.RewrittenQuery,
            IntentRoute = result.IntentRoute,
            Answer = result.Answer,
            Confidence = result.Confidence,
            GuardrailTriggered = result.GuardrailTriggered,
            Sources = result.Sources,
            Triad = result.Triad,
            Diagnostics = result.Diagnostics,
            SemanticMemory = facts
        });
    }

    /// <summary>
    /// Direct RAG retrieval query without session side-effects (useful for evaluation & diagnostics).
    /// </summary>
    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] RagChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Query))
        {
            return BadRequest(new { error = "Query string cannot be empty." });
        }

        var result = await _knowledgeBase.QueryAsync(request.Query, "diagnostics-session", "tester", "Customer");
        return Ok(result);
    }

    /// <summary>
    /// Returns pipeline metadata and active architecture parameters (SE3090 Lecture 06).
    /// </summary>
    [HttpGet("pipeline-info")]
    public IActionResult GetPipelineInfo()
    {
        return Ok(new
        {
            framework = "SE3090 Agentic RAG (Lecture 06)",
            blocksImplemented = new[]
            {
                "Block A: Grounding & RAG Pipeline (Ingestion, 1000-char chunking, 150-char overlap, Contextual headers)",
                "Block B: Embeddings & Vector Search (64-dim semantic embeddings, Cosine Similarity, L2 Normalization, MMR diversity)",
                "Block C: Production-Ready RAG (Query rewrite/multi-query, Hybrid Dense+BM25, Reciprocal Rank Fusion k=60, RAG Triad, Anti-Hallucination Guardrail)",
                "Block D: Agent Memory (Short-term sliding window, Semantic user facts extraction, Episodic event tracking)"
            },
            indexStats = new
            {
                documents = _knowledgeBase.DocumentCount,
                chunks = _knowledgeBase.ChunkCount,
                embeddingDimension = SemanticEmbeddingGenerator.EmbeddingDimension,
                chunkSize = 1000,
                chunkOverlap = 150,
                rrfK = 60,
                mmrLambda = 0.65
            }
        });
    }

    /// <summary>
    /// Inspects memory state for a given session and user (Slide 48, 52, 53).
    /// </summary>
    [HttpGet("memory/{sessionId}")]
    public IActionResult GetMemory(string sessionId)
    {
        var userIdentifier = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "guest-user";
        var shortTerm = _memoryStore.GetRecentHistory(sessionId);
        var semantic = _memoryStore.GetUserFacts(userIdentifier);
        var episodic = _memoryStore.GetRecentEpisodes(userIdentifier);

        return Ok(new
        {
            sessionId,
            userIdentifier,
            shortTermBuffer = shortTerm.Select(h => new { role = h.Role, content = h.Content }),
            semanticUserFacts = semantic,
            episodicRecords = episodic
        });
    }

    /// <summary>
    /// Triggers re-indexing of documents and DB facilities.
    /// </summary>
    [HttpPost("reindex")]
    public async Task<IActionResult> Reindex()
    {
        await _knowledgeBase.InitializeOrReindexAsync();
        return Ok(new
        {
            message = "Knowledge base reindexed successfully.",
            documents = _knowledgeBase.DocumentCount,
            chunks = _knowledgeBase.ChunkCount
        });
    }

    /// <summary>
    /// Runs automated RAG Triad evaluation benchmarks on standard test cases (Slide 37).
    /// </summary>
    [HttpPost("evaluate")]
    public async Task<IActionResult> Evaluate()
    {
        var testCases = new[]
        {
            "What is the cancellation and refund policy?",
            "How much does Badminton Court cost per hour?",
            "What are the operating hours and participant guest limits?",
            "Can I rent badminton rackets and how much are they?",
            "Do you offer deep-sea submarine rentals?" // Out of domain: should trigger guardrail!
        };

        var results = new List<object>();
        foreach (var testQuery in testCases)
        {
            var res = await _knowledgeBase.QueryAsync(testQuery, "eval-session", "eval-user");
            results.Add(new
            {
                question = testQuery,
                guardrailTriggered = res.GuardrailTriggered,
                confidence = res.Confidence,
                contextRelevance = res.Triad.ContextRelevance,
                faithfulness = res.Triad.Faithfulness,
                answerRelevance = res.Triad.AnswerRelevance,
                overallQuality = Math.Round(res.Triad.OverallQuality, 3),
                assessment = res.Triad.Assessment,
                citations = res.Sources.Select(s => s.ReferenceTag).ToList()
            });
        }

        return Ok(new
        {
            evaluator = "RAG Triad (SE3090 Lecture 06, Slide 37)",
            totalTests = testCases.Length,
            benchmarks = results
        });
    }
}
