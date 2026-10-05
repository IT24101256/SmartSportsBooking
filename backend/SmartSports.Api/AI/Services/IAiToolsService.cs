namespace SmartSportsFacilityBooking.AI.Services;

public interface IAiToolsService
{
    Task<string> GetLiveKnowledgeContextJsonAsync();
    Task<string> GetFacilitiesJsonAsync();
    Task<string> GetFacilityDetailsJsonAsync(int facilityId);
    Task<string> GetCurrentAvailabilityJsonAsync(int facilityId, DateTime date);
    Task<string> GetUserBookingsJsonAsync(int userId);
    Task<string> GetBookingStatusJsonAsync(int bookingId, int userId, bool isPrivileged);
}
