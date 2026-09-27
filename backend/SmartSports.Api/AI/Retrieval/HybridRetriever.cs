namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// Hybrid Retriever with Reciprocal Rank Fusion (RRF) and MMR Reranking (SE3090 Lecture 06, Slides 32-34).
/// Combines dense semantic vector search with sparse BM25 keyword matching.
/// Fuses rankings via RRF: RRF(d) = \sum 1 / (60 + rank_r(d)).
/// Applies Maximal Marginal Relevance (MMR) for diversity to eliminate repetitive chunks.
/// </summary>
public sealed class HybridRetriever
{
    private const int RrfK = 60; // Standard dampening constant from Slide 32
    private readonly BM25Retriever _bm25Retriever;
    private readonly IEmbeddingModel _embeddingModel;
    private readonly List<DocumentChunk> _indexedChunks = new();

    public HybridRetriever(BM25Retriever bm25Retriever, IEmbeddingModel embeddingModel)
    {
        _bm25Retriever = bm25Retriever;
        _embeddingModel = embeddingModel;
    }

    public int ChunkCount => _indexedChunks.Count;

    public void IndexChunks(IReadOnlyList<DocumentChunk> chunks)
    {
        _indexedChunks.Clear();
        _indexedChunks.AddRange(chunks);
        _bm25Retriever.IndexChunks(chunks);
    }

    public async Task<List<HybridRetrievalCandidate>> RetrieveHybridAsync(
        string query,
        int wideCandidatesCount = 20,
        int narrowFinalCount = 5,
        float mmrLambda = 0.65f,
        string? roleAcl = null)
    {
        if (_indexedChunks.Count == 0 || string.IsNullOrWhiteSpace(query))
        {
            return new List<HybridRetrievalCandidate>();
        }

        // 1. Dense Semantic Vector Search (Slide 15-18)
        var queryVector = await _embeddingModel.GenerateEmbeddingAsync(query);

        var denseRanked = _indexedChunks
            .Select((chunk, idx) =>
            {
                // Both chunk.Embedding and queryVector are L2-normalized,
                // so DotProduct directly equals CosineSimilarity (Slide 18)
                var similarity = VectorMath.DotProduct(queryVector, chunk.Embedding);
                return (Chunk: chunk, Score: similarity);
            })
            .OrderByDescending(x => x.Score)
            .Take(wideCandidatesCount)
            .Select((x, rank) => (x.Chunk, x.Score, Rank: rank + 1))
            .ToList();

        // 2. Sparse BM25 Search (Slide 32-33)
        var bm25Ranked = _bm25Retriever.Search(query, wideCandidatesCount);

        // 3. Reciprocal Rank Fusion (RRF) (Slide 32)
        // RRF(d) = \sum_{r \in {dense, bm25}} 1.0 / (RrfK + rank_r(d))
        var candidateMap = new Dictionary<string, HybridRetrievalCandidate>(StringComparer.OrdinalIgnoreCase);

        foreach (var (chunk, score, rank) in denseRanked)
        {
            if (!candidateMap.TryGetValue(chunk.ChunkId, out var candidate))
            {
                candidate = new HybridRetrievalCandidate { Chunk = chunk };
                candidateMap[chunk.ChunkId] = candidate;
            }
            candidate.DenseScore = score;
            candidate.DenseRank = rank;
            candidate.RrfScore += 1.0 / (RrfK + rank);
        }

        foreach (var (chunk, score, rank) in bm25Ranked)
        {
            if (!candidateMap.TryGetValue(chunk.ChunkId, out var candidate))
            {
                candidate = new HybridRetrievalCandidate { Chunk = chunk };
                candidateMap[chunk.ChunkId] = candidate;
            }
            candidate.BM25Score = score;
            candidate.BM25Rank = rank;
            candidate.RrfScore += 1.0 / (RrfK + rank);
        }

        var candidateList = candidateMap.Values.ToList();

        // Optional ACL-aware filtering (Slide 43: Security)
        if (!string.IsNullOrWhiteSpace(roleAcl) && roleAcl.Equals("Customer", StringComparison.OrdinalIgnoreCase))
        {
            candidateList = candidateList
                .Where(c => !c.Chunk.Category.Equals("InternalStaffOnly", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (candidateList.Count == 0) return new List<HybridRetrievalCandidate>();

        // 4. Two-Stage Retrieval: Narrow down using MMR diversity re-ranking (Slides 21, 34)
        var candidateEmbeddings = candidateList.Select(c => c.Chunk.Embedding).ToList();
        var candidateScores = candidateList.Select(c => (float)c.RrfScore).ToList();

        var selectedIndices = VectorMath.MaximalMarginalRelevance(
            queryVector,
            candidateEmbeddings,
            candidateScores,
            narrowFinalCount,
            mmrLambda
        );

        var finalResults = new List<HybridRetrievalCandidate>();
        foreach (var idx in selectedIndices)
        {
            var candidate = candidateList[idx];
            candidate.FinalScore = candidate.RrfScore;
            finalResults.Add(candidate);
        }

        return finalResults;
    }
}
