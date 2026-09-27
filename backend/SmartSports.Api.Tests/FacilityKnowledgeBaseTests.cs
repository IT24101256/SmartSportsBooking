using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Memory;
using SmartSportsFacilityBooking.AI.Retrieval;
using SmartSportsFacilityBooking.Data;
using Xunit;

namespace SmartSports.Api.Tests;

public class FacilityKnowledgeBaseTests
{
    [Fact]
    public async Task KnowledgeBase_Indexes_And_AnswersGroundedQuestions_WithCitations()
    {
        // Standard unconfigured DbContext triggers resilient fallback
        var options = new DbContextOptionsBuilder<AppDbContext>().Options;
        using var context = new AppDbContext(options);

        var embedder = new SemanticEmbeddingGenerator();
        var bm25 = new BM25Retriever();
        var hybrid = new HybridRetriever(bm25, embedder);
        var transformer = new QueryTransformer();
        var memory = new AgentMemoryStore();

        var kb = new FacilityKnowledgeBase(context, embedder, bm25, hybrid, transformer, memory);
        await kb.InitializeOrReindexAsync();

        Assert.True(kb.DocumentCount > 0);
        Assert.True(kb.ChunkCount > 0);

        // Query 1: Cancellation policy
        var cancelResult = await kb.QueryAsync("What is the cancellation and refund policy?");
        Assert.False(cancelResult.GuardrailTriggered);
        Assert.Contains("refund", cancelResult.Answer, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(cancelResult.Sources);
        Assert.True(cancelResult.Triad.Faithfulness > 0.4);

        // Query 2: Badminton court price
        var badmintonResult = await kb.QueryAsync("How much does Badminton Court cost?");
        Assert.False(badmintonResult.GuardrailTriggered);
        Assert.Contains("badminton", badmintonResult.Answer, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(badmintonResult.Sources);

        // Query 3: Conversational follow-up (Slide 55: Conversational RAG)
        var sessionId = "conversation-test-1";
        await kb.QueryAsync("Tell me about Badminton Court.", sessionId: sessionId);
        var followUpResult = await kb.QueryAsync("What shoes should I wear?", sessionId: sessionId);
        Assert.Contains("non-marking", followUpResult.Answer, StringComparison.OrdinalIgnoreCase);

        // Query 4: Unanswerable query triggers Anti-Hallucination Guardrail (Slide 24)
        var alienResult = await kb.QueryAsync("Can I land my spaceship on the roof?");
        Assert.True(alienResult.GuardrailTriggered);
        Assert.Equal(RagPostProcessor.DefaultGuardrailResponse, alienResult.Answer);
    }
}
