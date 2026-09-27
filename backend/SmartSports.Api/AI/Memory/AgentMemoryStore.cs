using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace SmartSportsFacilityBooking.AI.Memory;

/// <summary>
/// Structured User Fact for Semantic Memory (SE3090 Lecture 06, Slide 52).
/// Equivalent to: class UserFact(BaseModel): fact: str, category: Literal[...]
/// </summary>
public sealed class UserFact
{
    public string Fact { get; set; } = string.Empty;
    public string Category { get; set; } = "preference"; // "preference", "biography", "budget", "skill"
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Episodic Event Record (SE3090 Lecture 06, Slide 53).
/// Stores summaries of past booking interactions, past events, and outcomes.
/// </summary>
public sealed class EpisodicRecord
{
    public string EventId { get; set; } = Guid.NewGuid().ToString("N");
    public string Summary { get; set; } = string.Empty;
    public string Outcome { get; set; } = string.Empty;
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Comprehensive Agent Memory Architecture (SE3090 Lecture 06, Slides 45-55):
/// 1. Working / Short-Term Memory: Sliding window buffer of recent conversation turns per session.
/// 2. Semantic Memory: Extracted structured user facts & preferences.
/// 3. Episodic Memory: Summaries of past interactions & booking events.
/// 4. Procedural Memory: System rules, grounding constraints, and tool specs.
/// </summary>
public sealed class AgentMemoryStore
{
    private const int MaxShortTermWindow = 10; // Sliding window size (Slide 49)

    // Session-based short term memory: SessionId -> List of (Role, Content, Timestamp)
    private readonly ConcurrentDictionary<string, List<(string Role, string Content, DateTime TimestampUtc)>> _shortTermBuffers = new();

    // User-based semantic memory: UserId/Email -> List of UserFacts
    private readonly ConcurrentDictionary<string, List<UserFact>> _semanticMemories = new();

    // User-based episodic memory: UserId/Email -> List of EpisodicRecords
    private readonly ConcurrentDictionary<string, List<EpisodicRecord>> _episodicMemories = new();

    // --- SHORT-TERM MEMORY (Slides 48-50) ---

    public IReadOnlyList<(string Role, string Content)> GetRecentHistory(string sessionId, int limit = MaxShortTermWindow)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return Array.Empty<(string, string)>();
        if (!_shortTermBuffers.TryGetValue(sessionId, out var buffer)) return Array.Empty<(string, string)>();

        lock (buffer)
        {
            return buffer
                .TakeLast(limit)
                .Select(item => (item.Role, item.Content))
                .ToList();
        }
    }

    public void AppendExchange(string sessionId, string userMessage, string assistantReply)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return;

        var buffer = _shortTermBuffers.GetOrAdd(sessionId, _ => new List<(string, string, DateTime)>());
        lock (buffer)
        {
            buffer.Add(("user", userMessage, DateTime.UtcNow));
            buffer.Add(("assistant", assistantReply, DateTime.UtcNow));

            // Sliding Windowing / Trimming (Slide 49)
            if (buffer.Count > MaxShortTermWindow * 2)
            {
                var removeCount = buffer.Count - (MaxShortTermWindow * 2);
                buffer.RemoveRange(0, removeCount);
            }
        }
    }

    // --- SEMANTIC MEMORY (Slide 52) ---

    public void StoreUserFact(string userIdentifier, string fact, string category = "preference")
    {
        if (string.IsNullOrWhiteSpace(userIdentifier) || string.IsNullOrWhiteSpace(fact)) return;

        var facts = _semanticMemories.GetOrAdd(userIdentifier, _ => new List<UserFact>());
        lock (facts)
        {
            if (!facts.Any(f => f.Fact.Equals(fact, StringComparison.OrdinalIgnoreCase)))
            {
                facts.Add(new UserFact { Fact = fact.Trim(), Category = category, TimestampUtc = DateTime.UtcNow });
            }
        }
    }

    public IReadOnlyList<UserFact> GetUserFacts(string userIdentifier, int limit = 5)
    {
        if (string.IsNullOrWhiteSpace(userIdentifier)) return Array.Empty<UserFact>();
        if (!_semanticMemories.TryGetValue(userIdentifier, out var facts)) return Array.Empty<UserFact>();

        lock (facts)
        {
            return facts.TakeLast(limit).ToList();
        }
    }

    /// <summary>
    /// Automatic semantic memory extraction from conversation turn (Slide 52: extract -> store).
    /// </summary>
    public void ExtractAndStoreFacts(string userIdentifier, string userMessage)
    {
        if (string.IsNullOrWhiteSpace(userIdentifier) || string.IsNullOrWhiteSpace(userMessage)) return;

        var lower = userMessage.ToLowerInvariant();

        // Extract sport preference
        var sports = new[] { "badminton", "football", "swimming", "tennis", "basketball", "volleyball", "cricket", "fitness" };
        foreach (var sport in sports)
        {
            if (lower.Contains($"i like {sport}") || lower.Contains($"i love {sport}") || lower.Contains($"i prefer {sport}") || lower.Contains($"usually play {sport}"))
            {
                StoreUserFact(userIdentifier, $"Prefers playing {sport}", "preference");
            }
        }

        // Extract timing preference
        if (lower.Contains("morning") || lower.Contains("early"))
        {
            StoreUserFact(userIdentifier, "Prefers morning slots (06:00 - 10:00)", "preference");
        }
        else if (lower.Contains("evening") || lower.Contains("night") || lower.Contains("after work"))
        {
            StoreUserFact(userIdentifier, "Prefers evening slots (18:00 - 22:00)", "preference");
        }

        // Extract group size
        var groupMatch = Regex.Match(lower, @"\b(\d+)\s*(people|players|friends|guests)\b");
        if (groupMatch.Success)
        {
            StoreUserFact(userIdentifier, $"Usually organizes for {groupMatch.Groups[1].Value} players", "biography");
        }
    }

    // --- EPISODIC MEMORY (Slide 53) ---

    public void StoreEpisode(string userIdentifier, string summary, string outcome)
    {
        if (string.IsNullOrWhiteSpace(userIdentifier) || string.IsNullOrWhiteSpace(summary)) return;

        var episodes = _episodicMemories.GetOrAdd(userIdentifier, _ => new List<EpisodicRecord>());
        lock (episodes)
        {
            episodes.Add(new EpisodicRecord
            {
                Summary = summary.Trim(),
                Outcome = outcome.Trim(),
                TimestampUtc = DateTime.UtcNow
            });
        }
    }

    public IReadOnlyList<EpisodicRecord> GetRecentEpisodes(string userIdentifier, int limit = 3)
    {
        if (string.IsNullOrWhiteSpace(userIdentifier)) return Array.Empty<EpisodicRecord>();
        if (!_episodicMemories.TryGetValue(userIdentifier, out var episodes)) return Array.Empty<EpisodicRecord>();

        lock (episodes)
        {
            return episodes.TakeLast(limit).ToList();
        }
    }
}
