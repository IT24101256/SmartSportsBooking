using SmartSportsFacilityBooking.AI.Models;

namespace SmartSportsFacilityBooking.AI.Services;

public interface IAgenticRagService
{
    Task<AiChatResponse> ProcessChatAsync(AiChatRequest request, int? userId, bool isPrivileged);
    Task<AiChatSession?> GetSessionHistoryAsync(string conversationId, int? userId);
}
