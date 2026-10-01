using SmartSportsFacilityBooking.AI.Models;

namespace SmartSportsFacilityBooking.AI.Services;

public interface IKnowledgeBaseRetriever
{
    Task InitializeAsync();
    Task<List<RetrievalResult>> RetrieveAsync(string query, int topK = 3);
}
