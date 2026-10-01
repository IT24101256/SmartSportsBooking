using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SmartSportsFacilityBooking.AI.Services;

public class GeminiClient : IGeminiClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiClient> _logger;
    private readonly string? _apiKey;
    private readonly string _modelName;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public GeminiClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? _configuration["Gemini:ApiKey"]
            ?? _configuration["Google:ApiKey"]
            ?? _configuration["Ai:ApiKey"];

        _modelName = Environment.GetEnvironmentVariable("GEMINI_MODEL")
            ?? _configuration["Gemini:Model"]
            ?? "gemini-1.5-flash";

        if (!IsConfigured)
        {
            _logger.LogInformation("Gemini API key is not configured. Running in high-fidelity deterministic offline agent mode.");
        }
        else
        {
            _logger.LogInformation("Gemini API client initialized with model: {Model}", _modelName);
        }
    }

    public async Task<string> GenerateContentAsync(string systemPrompt, string userPrompt, double temperature = 0.2)
    {
        if (!IsConfigured)
        {
            return FallbackGenerate(systemPrompt, userPrompt);
        }

        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_modelName}:generateContent?key={_apiKey}";

            var requestBody = new
            {
                systemInstruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userPrompt } }
                    }
                },
                generationConfig = new
                {
                    temperature,
                    maxOutputTokens = 1000
                }
            };

            var jsonContent = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json");

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            var response = await _httpClient.PostAsync(url, jsonContent, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API returned {StatusCode}: {Error}. Falling back to deterministic engine.", response.StatusCode, err);
                return FallbackGenerate(systemPrompt, userPrompt);
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            var doc = JsonNode.Parse(responseBody);
            var text = doc?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();

            if (string.IsNullOrWhiteSpace(text))
            {
                // check alternate path in response
                text = doc?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();
            }

            return !string.IsNullOrWhiteSpace(text) ? text.Trim() : FallbackGenerate(systemPrompt, userPrompt);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to call Gemini API. Falling back to deterministic engine.");
            return FallbackGenerate(systemPrompt, userPrompt);
        }
    }

    public async Task<bool> GradeRelevanceAsync(string question, string retrievedContext)
    {
        if (string.IsNullOrWhiteSpace(retrievedContext)) return false;

        // Quick heuristic check
        var qTerms = question.ToLowerInvariant()
            .Split(new[] { ' ', '?', ',', '.' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2)
            .ToList();

        var ctxLower = retrievedContext.ToLowerInvariant();
        int matches = qTerms.Count(t => ctxLower.Contains(t));
        double termOverlapRatio = qTerms.Count > 0 ? (double)matches / qTerms.Count : 0;

        if (!IsConfigured)
        {
            return termOverlapRatio >= 0.25;
        }

        try
        {
            var systemPrompt = "You are a retrieval grader. Determine whether the retrieved context contains relevant information to answer the question. Reply with ONLY 'YES' or 'NO'.";
            var userPrompt = $"Question: {question}\n\nRetrieved Context:\n{retrievedContext}\n\nIs this context relevant to answer the question?";
            var response = await GenerateContentAsync(systemPrompt, userPrompt, temperature: 0.0);
            return response.Contains("YES", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return termOverlapRatio >= 0.25;
        }
    }

    public async Task<string> RewriteQueryAsync(string originalQuery, int retryCount)
    {
        if (!IsConfigured)
        {
            // Deterministic query expansion
            return FallbackRewriteQuery(originalQuery, retryCount);
        }

        try
        {
            var systemPrompt = "You are a query rewriting agent for a sports booking knowledge base search. Rewrite the user's inquiry into a clearer, keyword-focused search query to retrieve accurate policy, facility, or booking details. Return ONLY the rewritten query text.";
            var userPrompt = $"Original query: {originalQuery}\nRetry count: {retryCount}\nProvide a refined search query:";
            var rewritten = await GenerateContentAsync(systemPrompt, userPrompt, temperature: 0.3);
            return !string.IsNullOrWhiteSpace(rewritten) ? rewritten.Trim() : FallbackRewriteQuery(originalQuery, retryCount);
        }
        catch
        {
            return FallbackRewriteQuery(originalQuery, retryCount);
        }
    }

    private static string FallbackRewriteQuery(string query, int retryCount)
    {
        var lower = query.ToLowerInvariant();
        if (lower.Contains("price") || lower.Contains("cost") || lower.Contains("rate") || lower.Contains("how much"))
        {
            return $"{query} facility hourly rate pricing packages";
        }
        if (lower.Contains("cancel") || lower.Contains("refund") || lower.Contains("money back"))
        {
            return "cancellation refund percentage policy 24 hours 12 hours";
        }
        if (lower.Contains("rain") || lower.Contains("weather"))
        {
            return "weather reschedule rain check outdoor facilities";
        }
        if (lower.Contains("time") || lower.Contains("open") || lower.Contains("hour"))
        {
            return "operating hours whole hour 08:00 to 23:00 midnight booking";
        }
        if (lower.Contains("book") || lower.Contains("reserve"))
        {
            return "booking rules requirements start time duration payment";
        }
        if (lower.Contains("help") || lower.Contains("who are you") || lower.Contains("what can you do"))
        {
            return "MySpot assistant overview capabilities features";
        }
        return $"{query} MySpot information";
    }

    private static string FallbackGenerate(string systemPrompt, string userPrompt)
    {
        // Extract context and question
        return "I am the MySpot Knowledge Assistant. Based on our authoritative knowledge base, I can provide verified details regarding facilities, rates, operating rules, cancellations, and real-time bookings.";
    }
}
