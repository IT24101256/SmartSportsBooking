namespace SmartSportsFacilityBooking.AI.Services;

public interface IGeminiClient
{
    bool IsConfigured { get; }
    Task<string> GenerateContentAsync(string systemPrompt, string userPrompt, double temperature = 0.2);
    Task<bool> GradeRelevanceAsync(string question, string retrievedContext);
    Task<string> RewriteQueryAsync(string originalQuery, int retryCount);
}
