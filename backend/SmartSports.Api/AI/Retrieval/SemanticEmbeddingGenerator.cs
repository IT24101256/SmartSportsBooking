using System.Text.RegularExpressions;

namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// Dense Semantic Embedding Generator (SE3090 Lecture 06, Slides 15-19).
/// Produces 64-dimensional L2-normalized dense vectors representing text meaning.
/// Maps semantic topics (sports domains, pricing, policies, amenities, rules)
/// and hashed n-gram token projections, with L2 unit-norm guarantee.
/// </summary>
public sealed class SemanticEmbeddingGenerator : IEmbeddingModel
{
    public const int EmbeddingDimension = 64;
    public int Dimension => EmbeddingDimension;

    // Structured semantic taxonomy buckets
    private static readonly (string[] keywords, int dimensionIndex, float weight)[] SemanticBuckets = new[]
    {
        // Sports Domains
        (new[] { "badminton", "shuttlecock", "racquet", "racket", "bwf", "court" }, 0, 2.5f),
        (new[] { "football", "soccer", "turf", "pitch", "goal", "fifa", "cleats" }, 1, 2.5f),
        (new[] { "swimming", "pool", "aquatic", "lane", "lifeguard", "swim", "water" }, 2, 2.5f),
        (new[] { "tennis", "doubles", "singles", "racquet", "clay", "hardcourt" }, 3, 2.5f),
        (new[] { "basketball", "hoop", "fiba", "hardwood", "dunk", "arena" }, 4, 2.5f),
        (new[] { "volleyball", "net", "spike", "serve", "sand" }, 5, 2.5f),
        (new[] { "cricket", "pitch", "wicket", "batsman", "bowler", "boundary", "nets" }, 6, 2.5f),
        (new[] { "fitness", "gym", "weights", "cardio", "trainer", "workout" }, 7, 2.5f),

        // Business & Operational Domains
        (new[] { "price", "rate", "cost", "hourly", "fee", "lkr", "budget", "cheap", "expensive", "pay" }, 8, 2.2f),
        (new[] { "cancel", "cancellation", "refund", "reschedule", "policy", "rain", "check" }, 9, 2.4f),
        (new[] { "book", "booking", "reserve", "reservation", "slot", "schedule", "time", "date" }, 10, 2.0f),
        (new[] { "hour", "hours", "time", "operating", "open", "close", "morning", "evening", "night", "06:00", "22:00" }, 11, 2.0f),
        (new[] { "guest", "guests", "capacity", "participants", "people", "limit", "max", "30" }, 12, 2.0f),
        (new[] { "amenity", "amenities", "lighting", "floodlight", "lights", "locker", "shower", "dressing", "spectator" }, 13, 2.0f),
        (new[] { "equipment", "rent", "rental", "gear", "ball", "balls", "shoes", "non-marking" }, 14, 2.0f),
        (new[] { "rule", "rules", "guideline", "safety", "conduct", "terms", "condition", "footwear" }, 15, 2.0f),
        (new[] { "coach", "coaching", "trainer", "lesson", "tournament", "championship", "event" }, 16, 2.0f),
        (new[] { "indoor", "outdoor", "covered", "weather", "rain" }, 17, 1.8f)
    };

    public Task<float[]> GenerateEmbeddingAsync(string text)
    {
        var vector = GenerateVector(text);
        return Task.FromResult(vector);
    }

    public Task<IReadOnlyList<float[]>> GenerateBatchEmbeddingsAsync(IReadOnlyList<string> texts)
    {
        var list = new List<float[]>(texts.Count);
        foreach (var text in texts)
        {
            list.Add(GenerateVector(text));
        }
        return Task.FromResult<IReadOnlyList<float[]>>(list);
    }

    public static float[] GenerateVector(string text)
    {
        var rawVector = new float[EmbeddingDimension];
        if (string.IsNullOrWhiteSpace(text))
        {
            return rawVector;
        }

        var normalizedText = text.ToLowerInvariant();
        var tokens = Tokenize(normalizedText);

        // 1. Project semantic buckets into primary dimensions (0-17)
        foreach (var bucket in SemanticBuckets)
        {
            var matchCount = 0;
            foreach (var kw in bucket.keywords)
            {
                if (normalizedText.Contains(kw))
                {
                    matchCount++;
                }
            }

            if (matchCount > 0)
            {
                rawVector[bucket.dimensionIndex] = MathF.Sqrt(matchCount) * bucket.weight;
            }
        }

        // 2. Hash-based semantic projection for vocabulary spread across remaining dimensions (18-63)
        const int hashStartIndex = 18;
        const int hashSlots = EmbeddingDimension - hashStartIndex;

        foreach (var token in tokens)
        {
            var tokenHash = GetStableHash(token);
            var slot = hashStartIndex + Math.Abs(tokenHash % hashSlots);
            var subwordWeight = 1.0f + (token.Length > 4 ? 0.3f : 0.0f);
            rawVector[slot] += subwordWeight;

            // Character tri-grams for typo resilience and morphology matching
            if (token.Length >= 3)
            {
                for (var i = 0; i <= token.Length - 3; i++)
                {
                    var triGram = token.Substring(i, 3);
                    var triHash = GetStableHash(triGram);
                    var triSlot = hashStartIndex + Math.Abs(triHash % hashSlots);
                    rawVector[triSlot] += 0.25f;
                }
            }
        }

        // 3. Strict L2 Normalization (Slide 18)
        // ||a|| = 1.0 -> dot product equals cosine similarity
        return VectorMath.L2Normalize(rawVector);
    }

    private static List<string> Tokenize(string text)
    {
        return Regex.Matches(text, "[a-z0-9]+")
            .Select(m => m.Value)
            .Where(t => t.Length > 1)
            .ToList();
    }

    private static int GetStableHash(string str)
    {
        unchecked
        {
            var hash = 23;
            foreach (var c in str)
            {
                hash = hash * 31 + c;
            }
            return hash;
        }
    }
}
