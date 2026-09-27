using SmartSportsFacilityBooking.AI.Retrieval;
using Xunit;

namespace SmartSports.Api.Tests;

public class VectorMathTests
{
    [Fact]
    public void DotProduct_CalculatesCorrectly()
    {
        var a = new float[] { 1f, 2f, 3f };
        var b = new float[] { 4f, 5f, 6f };
        // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
        var dot = VectorMath.DotProduct(a, b);
        Assert.Equal(32f, dot, precision: 4);
    }

    [Fact]
    public void EuclideanDistance_CalculatesCorrectly()
    {
        var a = new float[] { 0f, 0f };
        var b = new float[] { 3f, 4f };
        var dist = VectorMath.EuclideanDistance(a, b);
        Assert.Equal(5f, dist, precision: 4);
    }

    [Fact]
    public void L2Normalization_EnsuresLengthIsOne()
    {
        var a = new float[] { 3f, 4f, 0f };
        var normalized = VectorMath.L2Normalize(a);

        var normSq = 0f;
        foreach (var val in normalized)
        {
            normSq += val * val;
        }

        Assert.Equal(1f, MathF.Sqrt(normSq), precision: 4);
    }

    [Fact]
    public void L2Normalized_DotProduct_Equals_CosineSimilarity()
    {
        // SE3090 Lecture 06, Slide 18:
        // "On L2-normalized vectors, dot product and cosine similarity give the same ranking."
        var a = VectorMath.L2Normalize(new float[] { 1.2f, 3.4f, -0.5f, 2.1f });
        var b = VectorMath.L2Normalize(new float[] { 0.8f, 2.9f, 1.1f, -0.4f });

        var dot = VectorMath.DotProduct(a, b);
        var cosine = VectorMath.CosineSimilarity(a, b);

        Assert.Equal(dot, cosine, precision: 4);
    }

    [Fact]
    public void MaximalMarginalRelevance_BalancesRelevanceAndDiversity()
    {
        // SE3090 Lecture 06, Slide 21:
        // Score = lambda * relevance - (1 - lambda) * repetition
        var query = VectorMath.L2Normalize(new float[] { 1f, 0f, 0f });

        // Candidate 0: very similar to query
        var c0 = VectorMath.L2Normalize(new float[] { 0.99f, 0.05f, 0f });
        // Candidate 1: almost duplicate of Candidate 0
        var c1 = VectorMath.L2Normalize(new float[] { 0.98f, 0.06f, 0f });
        // Candidate 2: distinct, still somewhat relevant
        var c2 = VectorMath.L2Normalize(new float[] { 0.7f, 0.7f, 0f });

        var candidates = new List<float[]> { c0, c1, c2 };
        var relevanceScores = new List<float> { 0.95f, 0.94f, 0.72f };

        // Select top 2 using MMR (lambda = 0.5)
        var selected = VectorMath.MaximalMarginalRelevance(query, candidates, relevanceScores, 2, lambda: 0.5f);

        Assert.Equal(2, selected.Count);
        Assert.Equal(0, selected[0]); // First pick is highest relevance
        Assert.Equal(2, selected[1]); // Second pick is c2 for diversity, skipping c1 duplicate!
    }
}
