using SmartSportsFacilityBooking.AI.Services;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.AI;

public static class AiServiceExtensions
{
    public static IServiceCollection AddMySpotAiSubsystem(this IServiceCollection services)
    {
        services.AddHttpClient<IGeminiClient, GeminiClient>();
        services.AddSingleton<IKnowledgeBaseRetriever, KnowledgeBaseRetriever>();
        services.AddScoped<IAiToolsService, AiToolsService>();
        services.AddScoped<IAgenticRagService, AgenticRagService>();
        services.AddScoped<IBookingWorkflowSupervisor, BookingWorkflowSupervisor>();
        services.AddScoped<IBookingSlotValidationService, BookingSlotValidationService>();

        return services;
    }
}
