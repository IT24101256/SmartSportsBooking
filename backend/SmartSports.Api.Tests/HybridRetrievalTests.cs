using SmartSportsFacilityBooking.AI.Retrieval;
using Xunit;

namespace SmartSports.Api.Tests;

public class HybridRetrievalTests
{
    [Fact]
    public void BM25_FindsExactTermsAndPhraseMatch()
    {
        // SE3090 Lecture 06, Slide 32-33: BM25 keyword retrieval
        var retriever = new BM25Retriever();
        var chunks = new List<DocumentChunk>
        {
            new() { ChunkId = "1", Title = "Badminton", RawText = "Badminton court costs LKR 1,200 per hour with wooden sprung floor." },
            new() { ChunkId = "2", Title = "Football", RawText = "Football field floodlit turf costs LKR 4,500 per hour." },
            new() { ChunkId = "3", Title = "Swimming", RawText = "Swimming pool heated half-Olympic lanes with lifeguard on duty." }
        };

        retriever.IndexChunks(chunks);

        var results = retriever.Search("Badminton court", topK: 3);

        Assert.NotEmpty(results);
        Assert.Equal("1", results[0].Chunk.ChunkId);
        Assert.True(results[0].Score > 0f);
    }

    [Fact]
    public async Task HybridRetriever_CombinesDenseAndBM25_WithRrfFormula()
    {
        // SE3090 Lecture 06, Slide 32-34: Hybrid retrieval & RRF
        var bm25 = new BM25Retriever();
        var embedder = new SemanticEmbeddingGenerator();
        var hybrid = new HybridRetriever(bm25, embedder);

        var chunks = new List<DocumentChunk>
        {
            new()
            {
                ChunkId = "court-badminton",
                Title = "Badminton Court",
                FacilityType = "Badminton",
                Category = "FacilityCatalog",
                Header = "[Source: Badminton Court | Category: FacilityCatalog]",
                RawText = "Badminton Court offers tournament quality synthetic flooring, LED anti-glare floodlights, and Yonex racket rentals."
            },
            new()
            {
                ChunkId = "court-football",
                Title = "Football Field",
                FacilityType = "Football",
                Category = "FacilityCatalog",
                Header = "[Source: Football Field | Category: FacilityCatalog]",
                RawText = "Floodlit football field suitable for 7-a-side and 11-a-side matches on FIFA standard turf."
            }
        };

        var embeddings = await embedder.GenerateBatchEmbeddingsAsync(chunks.Select(c => c.ContentWithHeader).ToList());
        for (var i = 0; i < chunks.Count; i++)
        {
            chunks[i].Embedding = embeddings[i];
        }

        hybrid.IndexChunks(chunks);

        var candidates = await hybrid.RetrieveHybridAsync("badminton court racquets", wideCandidatesCount: 5, narrowFinalCount: 2);

        Assert.NotEmpty(candidates);
        Assert.Equal("court-badminton", candidates[0].Chunk.ChunkId);
        // Verify RRF score is > 0 and follows rank reciprocal formula
        Assert.True(candidates[0].RrfScore > 0.01);
    }
}
