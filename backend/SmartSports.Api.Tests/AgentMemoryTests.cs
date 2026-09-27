using SmartSportsFacilityBooking.AI.Memory;
using Xunit;

namespace SmartSports.Api.Tests;

public class AgentMemoryTests
{
    [Fact]
    public void ShortTermMemory_SlidingWindow_LimitsHistoryLength()
    {
        // SE3090 Lecture 06, Slide 48-50: Sliding window trimming
        var memory = new AgentMemoryStore();
        var sessionId = "test-session-1";

        for (var i = 1; i <= 15; i++)
        {
            memory.AppendExchange(sessionId, $"User question {i}", $"Assistant answer {i}");
        }

        var history = memory.GetRecentHistory(sessionId, limit: 10);
        Assert.True(history.Count <= 20); // 10 pairs = 20 messages
        Assert.Contains("15", history.Last().Content); // Most recent turn is preserved
    }

    [Fact]
    public void SemanticMemory_ExtractsAndStoresUserFacts()
    {
        // SE3090 Lecture 06, Slide 52: Semantic Memory (User facts)
        var memory = new AgentMemoryStore();
        var userEmail = "player@smartsports.com";

        memory.ExtractAndStoreFacts(userEmail, "I prefer badminton on Friday evening with 4 friends.");

        var facts = memory.GetUserFacts(userEmail);
        Assert.NotEmpty(facts);
        Assert.Contains(facts, f => f.Fact.Contains("badminton", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(facts, f => f.Fact.Contains("evening", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void EpisodicMemory_StoresAndRetrievesPastInteractions()
    {
        // SE3090 Lecture 06, Slide 53: Episodic Memory
        var memory = new AgentMemoryStore();
        var userEmail = "coach@smartsports.com";

        memory.StoreEpisode(userEmail, "Hosted 16-team badminton championship on Court 1-4", "Completed successfully with 5-star rating");

        var episodes = memory.GetRecentEpisodes(userEmail);
        Assert.Single(episodes);
        Assert.Equal("Completed successfully with 5-star rating", episodes[0].Outcome);
    }
}
