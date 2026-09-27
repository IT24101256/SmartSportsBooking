namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// Mathematical vector operations taught in SE3090 Lecture 06 (Slides 16-18, 21):
/// - Dot Product: a . b = \sum a_i * b_i
/// - Euclidean Distance: ||a - b|| = \sqrt{\sum (a_i - b_i)^2}
/// - Cosine Similarity: cos(\theta) = (a . b) / (||a|| * ||b||)
/// - L2 Normalization: ||a|| = 1.0 -> Squared Euclidean Distance = 2 - 2 * (a . b) = 2 - 2 * cos(\theta)
/// - Maximal Marginal Relevance (MMR): Score = \lambda * Relevance - (1 - \lambda) * Repetition
/// </summary>
public static class VectorMath
{
    public static float DotProduct(float[] a, float[] b)
    {
        if (a == null || b == null || a.Length != b.Length) return 0f;
        var sum = 0f;
        for (var i = 0; i < a.Length; i++)
        {
            sum += a[i] * b[i];
        }
        return sum;
    }

    public static float EuclideanDistance(float[] a, float[] b)
    {
        if (a == null || b == null || a.Length != b.Length) return float.MaxValue;
        var sum = 0f;
        for (var i = 0; i < a.Length; i++)
        {
            var diff = a[i] - b[i];
            sum += diff * diff;
        }
        return MathF.Sqrt(sum);
    }

    public static float CosineSimilarity(float[] a, float[] b)
    {
        if (a == null || b == null || a.Length != b.Length) return 0f;
        var dot = 0f;
        var normA = 0f;
        var normB = 0f;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        var denom = MathF.Sqrt(normA) * MathF.Sqrt(normB);
        return denom <= 0.0000001f ? 0f : Math.Clamp(dot / denom, -1f, 1f);
    }

    public static float[] L2Normalize(float[] vector)
    {
        if (vector == null || vector.Length == 0) return Array.Empty<float>();
        var normSq = 0f;
        for (var i = 0; i < vector.Length; i++)
        {
            normSq += vector[i] * vector[i];
        }

        var norm = MathF.Sqrt(normSq);
        if (norm <= 0.0000001f) return (float[])vector.Clone();

        var normalized = new float[vector.Length];
        for (var i = 0; i < vector.Length; i++)
        {
            normalized[i] = vector[i] / norm;
        }
        return normalized;
    }

    /// <summary>
    /// Maximal Marginal Relevance (MMR) re-ranking (Slide 21).
    /// Balances relevance to query with diversity among already selected chunks.
    /// Score = \lambda * Relevance(d, q) - (1 - \lambda) * \max_{s \in Selected} CosineSimilarity(d, s)
    /// </summary>
    public static List<int> MaximalMarginalRelevance(
        float[] queryEmbedding,
        IReadOnlyList<float[]> candidateEmbeddings,
        IReadOnlyList<float> candidateRelevanceScores,
        int selectK,
        float lambda = 0.6f)
    {
        var n = candidateEmbeddings.Count;
        if (n == 0 || selectK <= 0) return new List<int>();

        var selectedIndices = new List<int>(Math.Min(selectK, n));
        var remainingIndices = new HashSet<int>(Enumerable.Range(0, n));

        // Step 1: Pick the highest relevance candidate first
        var bestFirstIdx = -1;
        var bestFirstScore = float.MinValue;
        foreach (var idx in remainingIndices)
        {
            var score = candidateRelevanceScores[idx];
            if (score > bestFirstScore)
            {
                bestFirstScore = score;
                bestFirstIdx = idx;
            }
        }

        if (bestFirstIdx < 0) bestFirstIdx = 0;
        selectedIndices.Add(bestFirstIdx);
        remainingIndices.Remove(bestFirstIdx);

        // Step 2: Iteratively select candidate maximizing MMR score
        while (selectedIndices.Count < selectK && remainingIndices.Count > 0)
        {
            var bestIdx = -1;
            var bestMmrScore = float.MinValue;

            foreach (var idx in remainingIndices)
            {
                var candidateVec = candidateEmbeddings[idx];
                var relevance = candidateRelevanceScores[idx];

                // Max repetition with any already selected document
                var maxRepetition = 0f;
                foreach (var selIdx in selectedIndices)
                {
                    var similarity = CosineSimilarity(candidateVec, candidateEmbeddings[selIdx]);
                    if (similarity > maxRepetition) maxRepetition = similarity;
                }

                var mmrScore = (lambda * relevance) - ((1f - lambda) * maxRepetition);
                if (mmrScore > bestMmrScore)
                {
                    bestMmrScore = mmrScore;
                    bestIdx = idx;
                }
            }

            if (bestIdx < 0) break;
            selectedIndices.Add(bestIdx);
            remainingIndices.Remove(bestIdx);
        }

        return selectedIndices;
    }
}
