using SmartSportsFacilityBooking.AI.Retrieval;
using Xunit;

namespace SmartSports.Api.Tests;

public class RagTriadAndGuardrailTests
{
    [Fact]
    public void RagTriad_ComputesPositiveScores_ForGroundedPair()
    {
        // SE3090 Lecture 06, Slide 37: RAG Triad
        var question = "What is the cancellation and refund policy?";
        var context = "Cancellations made at least 24 hours prior receive a 100% full refund.";
        var answer = "You can cancel up to 24 hours in advance to receive a full refund.";

        var triad = RagTriadEvaluator.Evaluate(question, context, answer, guardrailTriggered: false);

        Assert.True(triad.ContextRelevance > 0.3);
        Assert.True(triad.Faithfulness > 0.4);
        Assert.True(triad.AnswerRelevance > 0.3);
        Assert.True(triad.OverallQuality > 0.5);
    }

    [Fact]
    public void AntiHallucinationGuardrail_CorrectlyIdentifiesTrigger()
    {
        // SE3090 Lecture 06, Slide 24: Anti-hallucination guardrail
        var question = "Do you rent nuclear submarines?";
        var triad = RagTriadEvaluator.Evaluate(question, "", RagPostProcessor.DefaultGuardrailResponse, guardrailTriggered: true);

        Assert.Equal(1.0, triad.Faithfulness); // Admitting lack of context is 100% faithful
        Assert.Contains("guardrail", triad.Assessment, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void LostInMiddle_ReordersChunksProperly()
    {
        // SE3090 Lecture 06, Slide 36: Lost-in-the-middle reordering
        var chunks = new List<DocumentChunk>
        {
            new() { ChunkId = "1" },
            new() { ChunkId = "2" },
            new() { ChunkId = "3" },
            new() { ChunkId = "4" }
        };

        var reordered = RagPostProcessor.ReorderLostInMiddle(chunks);
        Assert.Equal(4, reordered.Count);
        // The top two candidates (1 and 2) are placed at opposite edges
        Assert.Equal("1", reordered.First().ChunkId);
        Assert.Equal("2", reordered.Last().ChunkId);
    }
}
