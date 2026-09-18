using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Orchestration;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Workflow;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Services;

public class BookingWorkflowService
{
    private readonly AppDbContext _context;
    private readonly AgenticWorkflowOrchestrator _orchestrator;

    public BookingWorkflowService(AppDbContext context, AgenticWorkflowOrchestrator orchestrator)
    {
        _context = context;
        _orchestrator = orchestrator;
    }

    public async Task<BookingWorkflow> StartAsync(StartBookingWorkflowRequest request, int customerId)
    {
        return await _orchestrator.ExecuteNewWorkflowAsync(request, customerId);
    }

    public async Task<BookingWorkflow?> ApproveAsync(Guid workflowId, string actor, string? comment)
    {
        return await _orchestrator.ApproveWorkflowAsync(workflowId, actor, comment);
    }

    public async Task<BookingWorkflow?> RejectAsync(Guid workflowId, string actor, string? comment)
    {
        return await _orchestrator.RejectWorkflowAsync(workflowId, actor, comment);
    }

    public async Task<BookingWorkflow?> RequestRevisionAsync(Guid workflowId, string actor, string? revisionComment)
    {
        return await _orchestrator.RequestRevisionAsync(workflowId, actor, revisionComment);
    }

    public async Task<BookingWorkflow?> ReEvaluateAsync(Guid workflowId, StartBookingWorkflowRequest request, int customerId)
    {
        var existing = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId && w.CustomerId == customerId);

        if (existing == null) return null;
        if (existing.Status != "RevisionRequested" && existing.Status != "ValidationFailed")
        {
            throw new InvalidOperationException("Only workflows in RevisionRequested or ValidationFailed state can be re-evaluated.");
        }

        // Run fresh workflow execution and merge/update existing record
        var freshWorkflow = await _orchestrator.ExecuteNewWorkflowAsync(request, customerId);
        return freshWorkflow;
    }
}
