using System.Text.RegularExpressions;
using SmartSportsFacilityBooking.AI.Models;

namespace SmartSportsFacilityBooking.AI.Services;

public class KnowledgeBaseRetriever : IKnowledgeBaseRetriever
{
    private readonly ILogger<KnowledgeBaseRetriever> _logger;
    private readonly List<KnowledgeChunk> _chunks = new();
    private readonly Dictionary<string, double> _idfMap = new(StringComparer.OrdinalIgnoreCase);
    private bool _initialized = false;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    public KnowledgeBaseRetriever(ILogger<KnowledgeBaseRetriever> logger)
    {
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        if (_initialized) return;
        await _initLock.WaitAsync();
        try
        {
            if (_initialized) return;
            await LoadAndIndexDocumentsAsync();
            _initialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    private async Task LoadAndIndexDocumentsAsync()
    {
        _chunks.Clear();
        string content = string.Empty;

        // Try candidate paths to find MySpot_Knowledge_Base.md
        var candidatePaths = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "MySpot_Knowledge_Base.md"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "MySpot_Knowledge_Base.md"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "MySpot_Knowledge_Base.md"),
            Path.Combine(AppContext.BaseDirectory, "MySpot_Knowledge_Base.md"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "MySpot_Knowledge_Base.md"),
            @"d:\projects\clones\SmartSportsBooking\MySpot_Knowledge_Base.md"
        };

        foreach (var path in candidatePaths)
        {
            try
            {
                var fullPath = Path.GetFullPath(path);
                if (File.Exists(fullPath))
                {
                    content = await File.ReadAllTextAsync(fullPath);
                    _logger.LogInformation("Loaded MySpot Knowledge Base from {Path}", fullPath);
                    break;
                }
            }
            catch {}
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            _logger.LogWarning("MySpot_Knowledge_Base.md not found on disk, using embedded fallback content.");
            content = FallbackKnowledgeContent;
        }

        // CHUNKING: Split markdown content by headings
        var sections = SplitIntoSections(content);
        foreach (var section in sections)
        {
            var chunk = new KnowledgeChunk
            {
                Id = Guid.NewGuid().ToString("N")[..8],
                Title = section.Title,
                Category = section.Category,
                Source = "MySpot Knowledge Base",
                Content = section.Content.Trim(),
                Citation = $"[{section.Category}]",
                Keywords = ExtractKeywords(section.Title + " " + section.Content)
            };
            _chunks.Add(chunk);
        }

        // Build IDF dictionary for BM25 keyword search
        BuildIdfDictionary();

        // Build TF-IDF vectors for semantic cosine similarity retrieval
        BuildVectors();

        _logger.LogInformation("Successfully indexed {Count} chunks from MySpot Knowledge Base.", _chunks.Count);
    }

    public async Task<List<RetrievalResult>> RetrieveAsync(string query, int topK = 3)
    {
        await InitializeAsync();
        if (_chunks.Count == 0 || string.IsNullOrWhiteSpace(query))
        {
            return new List<RetrievalResult>();
        }

        var queryTokens = Tokenize(query);
        if (queryTokens.Count == 0) return new List<RetrievalResult>();

        // 1. BM25 / Keyword Retrieval
        var bm25Scores = new List<(KnowledgeChunk Chunk, double Score)>();
        foreach (var chunk in _chunks)
        {
            double score = ComputeBm25(queryTokens, chunk);
            bm25Scores.Add((chunk, score));
        }
        var rankedBm25 = bm25Scores.OrderByDescending(x => x.Score).ToList();

        // 2. Vector / Cosine Similarity Retrieval
        var queryVector = BuildVectorForTokens(queryTokens);
        var vectorScores = new List<(KnowledgeChunk Chunk, double Score)>();
        foreach (var chunk in _chunks)
        {
            double sim = chunk.Embedding != null ? CosineSimilarity(queryVector, chunk.Embedding) : 0;
            vectorScores.Add((chunk, sim));
        }
        var rankedVector = vectorScores.OrderByDescending(x => x.Score).ToList();

        // 3. Reciprocal Rank Fusion (RRF) - SE3090 Lab 06 concept
        // RRF_score(d) = sum( 1 / (k + rank_i(d)) ) with constant k = 60
        const double rrfK = 60.0;
        var rrfMap = new Dictionary<string, (KnowledgeChunk Chunk, double RrfScore, double Bm25Score, double VectorScore)>();

        for (int rank = 0; rank < rankedBm25.Count; rank++)
        {
            var item = rankedBm25[rank];
            if (item.Score <= 0.0001) break; // rankedBm25 is sorted descending
            double rrfVal = 1.0 / (rrfK + rank + 1);
            if (!rrfMap.ContainsKey(item.Chunk.Id))
            {
                rrfMap[item.Chunk.Id] = (item.Chunk, rrfVal, item.Score, 0.0);
            }
            else
            {
                var cur = rrfMap[item.Chunk.Id];
                rrfMap[item.Chunk.Id] = (cur.Chunk, cur.RrfScore + rrfVal, item.Score, cur.VectorScore);
            }
        }

        for (int rank = 0; rank < rankedVector.Count; rank++)
        {
            var item = rankedVector[rank];
            if (item.Score <= 0.08) break; // cosine similarity threshold for vector match
            double rrfVal = 1.0 / (rrfK + rank + 1);
            if (!rrfMap.ContainsKey(item.Chunk.Id))
            {
                rrfMap[item.Chunk.Id] = (item.Chunk, rrfVal, 0.0, item.Score);
            }
            else
            {
                var cur = rrfMap[item.Chunk.Id];
                rrfMap[item.Chunk.Id] = (cur.Chunk, cur.RrfScore + rrfVal, cur.Bm25Score, item.Score);
            }
        }

        var results = rrfMap.Values
            .OrderByDescending(x => x.RrfScore)
            .Take(topK)
            .Select(x => new RetrievalResult
            {
                Chunk = x.Chunk,
                Score = x.RrfScore,
                KeywordScore = x.Bm25Score,
                VectorScore = x.VectorScore,
                IsRelevant = x.Bm25Score > 0.05 || x.VectorScore > 0.15
            })
            .ToList();

        return results;
    }

    private List<(string Title, string Category, string Content)> SplitIntoSections(string markdown)
    {
        var result = new List<(string Title, string Category, string Content)>();
        var lines = markdown.Split('\n');
        string currentCategory = "General";
        string currentTitle = "Product Overview";
        var currentText = new System.Text.StringBuilder();

        foreach (var rawLine in lines)
        {
            var line = rawLine.TrimEnd('\r');
            if (line.StartsWith("## "))
            {
                if (currentText.Length > 0)
                {
                    result.Add((currentTitle, currentCategory, currentText.ToString()));
                    currentText.Clear();
                }
                var heading = line.Substring(3).Trim();
                // strip leading number e.g. "1. Product Overview" -> "Product Overview"
                heading = Regex.Replace(heading, @"^\d+\.\s*", "");
                currentCategory = heading;
                currentTitle = heading;
            }
            else if (line.StartsWith("### "))
            {
                if (currentText.Length > 0)
                {
                    result.Add((currentTitle, currentCategory, currentText.ToString()));
                    currentText.Clear();
                }
                var subHeading = line.Substring(4).Trim();
                currentTitle = subHeading;
            }
            else
            {
                currentText.AppendLine(line);
            }
        }

        if (currentText.Length > 0)
        {
            result.Add((currentTitle, currentCategory, currentText.ToString()));
        }

        return result;
    }

    private static List<string> Tokenize(string text)
    {
        return Regex.Matches(text.ToLowerInvariant(), @"[a-z0-9]+")
            .Select(m => m.Value)
            .Where(w => w.Length > 1 && !StopWords.Contains(w))
            .ToList();
    }

    private static List<string> ExtractKeywords(string text)
    {
        return Tokenize(text).Distinct().ToList();
    }

    private void BuildIdfDictionary()
    {
        _idfMap.Clear();
        int totalDocs = _chunks.Count;
        if (totalDocs == 0) return;

        var docFreqs = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var chunk in _chunks)
        {
            var uniqueTokens = Tokenize(chunk.Title + " " + chunk.Content).Distinct();
            foreach (var token in uniqueTokens)
            {
                docFreqs[token] = docFreqs.GetValueOrDefault(token, 0) + 1;
            }
        }

        foreach (var (token, df) in docFreqs)
        {
            // Standard BM25 IDF: ln((N - df + 0.5) / (df + 0.5) + 1)
            double idf = Math.Log((totalDocs - df + 0.5) / (df + 0.5) + 1.0);
            _idfMap[token] = Math.Max(0.1, idf);
        }
    }

    private double ComputeBm25(List<string> queryTokens, KnowledgeChunk chunk)
    {
        const double k1 = 1.5;
        const double b = 0.75;
        double avgDocLength = 80.0;

        var docTokens = Tokenize(chunk.Title + " " + chunk.Content);
        double docLength = docTokens.Count;
        var tf = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var t in docTokens)
        {
            tf[t] = tf.GetValueOrDefault(t, 0) + 1;
        }

        var titleTokens = Tokenize(chunk.Title);

        double score = 0.0;
        foreach (var q in queryTokens)
        {
            if (tf.TryGetValue(q, out int count))
            {
                double idf = _idfMap.GetValueOrDefault(q, 0.5);
                double tfWeight = (count * (k1 + 1.0)) / (count + k1 * (1.0 - b + b * (docLength / avgDocLength)));
                double termScore = idf * tfWeight;
                if (titleTokens.Contains(q)) termScore *= 2.0; // Boost title matches
                score += termScore;
            }
        }

        return score;
    }

    private void BuildVectors()
    {
        var vocabulary = _idfMap.Keys.Take(1024).ToList();
        for (int i = 0; i < _chunks.Count; i++)
        {
            var chunk = _chunks[i];
            var tokens = Tokenize(chunk.Title + " " + chunk.Content);
            chunk.Embedding = BuildVectorFromVocab(tokens, vocabulary);
        }
    }

    private float[] BuildVectorFromVocab(List<string> tokens, List<string> vocab)
    {
        var vec = new float[vocab.Count];
        var tf = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var t in tokens)
        {
            tf[t] = tf.GetValueOrDefault(t, 0) + 1;
        }

        for (int i = 0; i < vocab.Count; i++)
        {
            var word = vocab[i];
            if (tf.TryGetValue(word, out int count))
            {
                double idf = _idfMap.GetValueOrDefault(word, 0.5);
                vec[i] = (float)(count * idf);
            }
        }

        // Normalize
        Normalize(vec);
        return vec;
    }

    private float[] BuildVectorForTokens(List<string> tokens)
    {
        var vocab = _idfMap.Keys.Take(1024).ToList();
        return BuildVectorFromVocab(tokens, vocab);
    }

    private static void Normalize(float[] vec)
    {
        double sumSq = 0;
        for (int i = 0; i < vec.Length; i++) sumSq += vec[i] * vec[i];
        if (sumSq > 0)
        {
            float norm = (float)Math.Sqrt(sumSq);
            for (int i = 0; i < vec.Length; i++) vec[i] /= norm;
        }
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;
        double dot = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
        }
        return Math.Max(0.0, Math.Min(1.0, dot));
    }

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "the", "and", "or", "but", "if", "then", "of", "at", "by", "for",
        "with", "about", "against", "between", "into", "through", "during", "before",
        "after", "above", "below", "to", "from", "up", "down", "in", "out", "on",
        "off", "over", "under", "again", "further", "then", "once", "here", "there",
        "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
        "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
        "so", "than", "too", "very", "can", "will", "just", "don", "should", "now",
        "i", "you", "he", "she", "it", "we", "they", "is", "am", "are", "was", "were",
        "be", "been", "being", "have", "has", "had", "do", "does", "did"
    };

    private const string FallbackKnowledgeContent = @"
# MySpot Knowledge Base

## Product Overview
MySpot is a sports facility booking platform with a React web application, a Flutter mobile application, and an ASP.NET Core API backed by PostgreSQL.
Customers can register, browse facilities, check date-specific hourly availability, create, cancel, and reschedule bookings, pay by card or bank transfer, and view booking tickets and QR entry passes.

## Current Facilities
Seeded facilities: Badminton Court (Indoor, LKR 1,200/hr), Cricket Ground (Outdoor, LKR 6,500/hr), Football Field (Outdoor, LKR 4,500/hr), Indoor Basketball Arena (Indoor, LKR 3,000/hr), Swimming Pool (Outdoor, LKR 2,000/hr), Table Tennis Court (Indoor, LKR 1,000/hr), Volleyball Court (Outdoor, LKR 2,800/hr). Tennis and Fitness appear in equipment or interfaces, but there is no seeded facility for them.

## Booking Rules
Authentication is required to create or manage a booking.
Facility, date, start time, duration, customer name, NIC number, and 10-digit contact number are required.
Bookings cannot be made for past dates or times.
Start times must be on a whole hour from 08:00 through 23:00.
A booking must last at least one whole hour and finish by midnight (24:00).
Active bookings for the same facility and time cannot overlap.
The facility charge equals its hourly rate multiplied by the booked hours.

## Payment Methods and Status
Regular customer bookings support:
Card: Valid 16-digit card number, expiry date, and 3-digit CVV. After validation, recorded as paid and confirmed.
Bank transfer: Bank-slip upload is required. Starts as pending payment until an authorized Manager or Admin approves it.
Cash is accepted only for privileged manager or admin bookings.

## Cancellation and Refunds
Refunds are calculated from the time remaining before the booking starts using Sri Lanka Standard Time:
At least 24 hours prior: 100% full refund.
12 to less than 24 hours: 50% partial refund.
Less than 12 hours: 0% non-refundable.
Expired bookings cannot be cancelled.

## Weather and Rescheduling
Managers or Admins can request rescheduling for heavy rain, adverse weather, or maintenance. Outdoor facilities (Cricket, Football, Volleyball) are eligible for rain-checks. Customers can pick another available whole-hour slot.

## Frequently Asked Questions
What is the cheapest facility? Table Tennis Court at LKR 1,000/hour.
Can I book for half an hour? No, bookings require at least one whole hour starting on a whole hour.
Can I book after 23:00? No, bookings end by midnight.
";
}
