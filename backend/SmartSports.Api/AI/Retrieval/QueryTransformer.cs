using System.Text.RegularExpressions;

namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// Query Transformations taught in SE3090 Lecture 06 (Slide 31):
/// - Rewrite / Condense: Resolves coreference/pronouns from conversation history into a standalone query.
/// - Multi-Query: Expands query into multiple synonym/domain perspectives to maximize recall.
/// - HyDE (Hypothetical Document Embeddings): Adds expected passage patterns.
/// - Step-Back: Generates broader category query.
/// </summary>
public sealed class QueryTransformer
{
    private static readonly Dictionary<string, string[]> SportsSynonyms = new(StringComparer.OrdinalIgnoreCase)
    {
        { "badminton", new[] { "badminton court", "shuttlecock court", "indoor racquet court" } },
        { "football", new[] { "football field", "soccer turf", "floodlit pitch" } },
        { "swimming", new[] { "swimming pool", "aquatic lanes", "pool session" } },
        { "tennis", new[] { "tennis court", "tennis club", "racquet court" } },
        { "basketball", new[] { "basketball arena", "indoor basketball court", "hardwood arena" } },
        { "volleyball", new[] { "volleyball court", "sand volleyball" } },
        { "cricket", new[] { "cricket ground", "cricket pitch", "practice nets" } },
        { "fitness", new[] { "performance gym", "fitness center", "weight training" } }
    };

    /// <summary>
    /// Rewrites a follow-up question into a standalone question using conversation history (Slide 31 & 55).
    /// Resolves pronouns like "it", "that court", "the price", or elliptical follow-ups.
    /// </summary>
    public string RewriteAndCondense(string query, IReadOnlyList<(string Role, string Content)>? conversationHistory)
    {
        if (string.IsNullOrWhiteSpace(query)) return string.Empty;
        if (conversationHistory == null || conversationHistory.Count == 0) return query.Trim();

        var trimmed = query.Trim();
        var lower = trimmed.ToLowerInvariant();

        // 1. Check if query contains coreference pronouns
        var hasPronoun = Regex.IsMatch(lower, @"\b(it|its|that|this|the court|the ground|the facility|they|them|there)\b");

        // 2. Check if query is an elliptical follow-up
        var isEllipticalFollowUp = Regex.IsMatch(lower, @"^(what shoes|what equipment|how much|what rate|what price|what about|when is|is it|what time)\b");

        if (!hasPronoun && !isEllipticalFollowUp)
        {
            return trimmed; // Independent standalone question
        }

        // Search backward for the most recent facility or subject mentioned in conversation history
        string? referencedSubject = null;
        for (var i = conversationHistory.Count - 1; i >= 0; i--)
        {
            var msg = conversationHistory[i].Content;
            foreach (var key in SportsSynonyms.Keys)
            {
                if (msg.Contains(key, StringComparison.OrdinalIgnoreCase))
                {
                    referencedSubject = key;
                    break;
                }
            }
            if (referencedSubject != null) break;
        }

        if (referencedSubject == null) return trimmed;

        if (hasPronoun)
        {
            return Regex.Replace(trimmed, @"\b(it|that court|this court|the facility)\b", referencedSubject, RegexOptions.IgnoreCase);
        }

        return $"{trimmed} for {referencedSubject}";
    }

    /// <summary>
    /// Generates multi-query versions to improve recall across varied document phrasing (Slide 31).
    /// </summary>
    public List<string> GenerateMultiQueries(string standaloneQuery)
    {
        var queries = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { standaloneQuery };
        var lower = standaloneQuery.ToLowerInvariant();

        foreach (var (sport, synonyms) in SportsSynonyms)
        {
            if (lower.Contains(sport))
            {
                foreach (var syn in synonyms)
                {
                    queries.Add(lower.Replace(sport, syn));
                }
            }
        }

        // Add domain intent variations
        if (lower.Contains("cost") || lower.Contains("fee") || lower.Contains("price"))
        {
            queries.Add($"{standaloneQuery} hourly rates pricing payment");
        }
        else if (lower.Contains("cancel") || lower.Contains("refund"))
        {
            queries.Add($"{standaloneQuery} cancellation policy advance notice terms");
        }
        else if (lower.Contains("rule") || lower.Contains("hour") || lower.Contains("time") || lower.Contains("shoe") || lower.Contains("footwear"))
        {
            queries.Add($"{standaloneQuery} operating hours guest limits safety footwear");
        }

        return queries.Take(4).ToList();
    }
}
