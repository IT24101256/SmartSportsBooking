using System.Text.RegularExpressions;

namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// Sparse BM25 Keyword Retriever (SE3090 Lecture 06, Slides 32-33).
/// Inverted index for exact term matching, numbers, codes, names, and pricing.
/// Uses standard Okapi BM25 scoring with parameters k1 = 1.2, b = 0.75.
/// Filters standard IR stopwords to prevent false-positive matches on function words.
/// </summary>
public sealed class BM25Retriever
{
    private const float K1 = 1.2f;
    private const float B = 0.75f;

    private static readonly HashSet<string> Stopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "the", "and", "or", "but", "if", "then", "of", "at", "by", "for", "with",
        "about", "against", "between", "into", "through", "during", "before", "after",
        "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
        "again", "further", "once", "here", "there", "when", "where", "why", "how",
        "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
        "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
        "can", "will", "just", "should", "now", "i", "me", "my", "myself",
        "we", "our", "ours", "you", "your", "he", "him", "his", "she", "her", "they", "them",
        "it", "its", "what", "which", "who", "whom", "this", "that", "these", "those",
        "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did"
    };

    private readonly List<DocumentChunk> _chunks = new();
    private readonly Dictionary<string, List<(int chunkIndex, int termFreq)>> _invertedIndex = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<int> _docLengths = new();
    private float _avgDocLength = 0f;

    public int ChunkCount => _chunks.Count;

    public void IndexChunks(IEnumerable<DocumentChunk> chunks)
    {
        _chunks.Clear();
        _invertedIndex.Clear();
        _docLengths.Clear();

        var totalLen = 0;
        foreach (var chunk in chunks)
        {
            var chunkIndex = _chunks.Count;
            _chunks.Add(chunk);

            var tokens = Tokenize(chunk.ContentWithHeader);
            var docLen = tokens.Count;
            _docLengths.Add(docLen);
            totalLen += docLen;

            var termCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var token in tokens)
            {
                termCounts[token] = termCounts.GetValueOrDefault(token, 0) + 1;
            }

            foreach (var (term, count) in termCounts)
            {
                if (!_invertedIndex.TryGetValue(term, out var postings))
                {
                    postings = new List<(int, int)>();
                    _invertedIndex[term] = postings;
                }
                postings.Add((chunkIndex, count));
            }
        }

        _avgDocLength = _chunks.Count == 0 ? 0f : (float)totalLen / _chunks.Count;
    }

    public List<(DocumentChunk Chunk, float Score, int Rank)> Search(string query, int topK = 20)
    {
        if (_chunks.Count == 0 || string.IsNullOrWhiteSpace(query))
        {
            return new List<(DocumentChunk, float, int)>();
        }

        var queryTerms = Tokenize(query).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (queryTerms.Count == 0)
        {
            return new List<(DocumentChunk, float, int)>();
        }

        var scores = new float[_chunks.Count];
        var n = _chunks.Count;

        foreach (var term in queryTerms)
        {
            if (!_invertedIndex.TryGetValue(term, out var postings)) continue;

            // Okapi BM25 Inverse Document Frequency (IDF)
            var docFreq = postings.Count;
            var idf = MathF.Log((n - docFreq + 0.5f) / (docFreq + 0.5f) + 1.0f);

            foreach (var (docIdx, tf) in postings)
            {
                var docLen = _docLengths[docIdx];
                var tfScore = (tf * (K1 + 1f)) / (tf + K1 * (1f - B + B * (docLen / _avgDocLength)));
                scores[docIdx] += idf * tfScore;
            }
        }

        // Exact phrase boost if the non-stopword query appears in chunk
        var significantWords = queryTerms.Where(w => w.Length > 2).ToList();
        if (significantWords.Count > 1)
        {
            var combinedPhrase = string.Join(" ", significantWords);
            for (var i = 0; i < _chunks.Count; i++)
            {
                if (_chunks[i].ContentWithHeader.Contains(combinedPhrase, StringComparison.OrdinalIgnoreCase))
                {
                    scores[i] += 2.0f;
                }
            }
        }

        return _chunks
            .Select((chunk, idx) => (Chunk: chunk, Score: scores[idx]))
            .Where(x => x.Score > 0f)
            .OrderByDescending(x => x.Score)
            .Take(topK)
            .Select((x, rank) => (x.Chunk, x.Score, Rank: rank + 1))
            .ToList();
    }

    public static List<string> Tokenize(string text)
    {
        return Regex.Matches(text.ToLowerInvariant(), "[a-z0-9]+")
            .Select(m => m.Value)
            .Where(t => t.Length > 1 && !Stopwords.Contains(t))
            .ToList();
    }
}
