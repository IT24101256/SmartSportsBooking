using SmartSportsFacilityBooking.AI.Models;

namespace SmartSportsFacilityBooking.AI.Services;

public interface IBookingWorkflowSupervisor
{
    Task<BookingWorkflowResponse> StartWorkflowAsync(int userId, string? initialGoal = null);
    Task<BookingWorkflowResponse> ProcessMessageAsync(int userId, Guid workflowId, string message);
    Task<BookingWorkflowResponse> ConfirmAndCommitBookingAsync(int userId, ConfirmBookingWorkflowRequest request);
    Task<BookingWorkflowResponse?> GetWorkflowStatusAsync(int userId, Guid workflowId);
}
